# OpenAPI auto-generation — enablement tasks

**Goal:** make the OpenAPI spec **generated from the schemas that already validate
requests at runtime**, so it can never drift from the API. Today the spec is
hand-maintained and has already drifted (see *Why* below). This doc records the
concrete points that need attention — mostly around how zod is wired — before
`generator.ts` can replace the hand-written `docs/openapi.yml`.

Status legend: 🔴 not started · 🟡 in progress / partial · ✅ done

## Why (the drift is real, not hypothetical)

`docs/openapi.yml` is **hand-maintained** (~3088 lines, ~60 paths). Its
`TemperatureWebhookPayload` schema is **wrong**: it documents a legacy flat
snake_case body (`device_id`, `temperature`, `battery`, `firmware_version`) while
the live endpoint validates `deviceId` + `readings[]` + `batteryLevel` +
`alertPending` + `alertTemp` (verified end-to-end by
[`scripts/test-alert-pipeline.sh`](../scripts/test-alert-pipeline.sh)). None of the
alert-driving fields are documented. Hand-maintenance across ~60 endpoints does not
scale and the README already (incorrectly) calls `openapi.yml` the "generated client
source of truth".

## Current state — three parallel representations of the same contract

| Layer | Lib | Location | State |
|---|---|---|---|
| **Route validators** (runtime truth) | `ValidationService` (`v.object`), zod underneath | `apps/backend/src/routes/*.ts` | ✅ correct, but zod is **hidden** behind the abstraction |
| **DTO schemas** (what the generator reads) | raw zod | `packages/core/src/*/infrastructure/dto/*.schemas.ts` | 🟡 only ~17 schemas, a **parallel** set that can drift from the validators |
| **Hand-written spec** | YAML | `docs/openapi.yml` | 🔴 drifts; currently the published artifact |

Plus the half-built generator:
- [`packages/core/src/shared/infrastructure/openapi/generator.ts`](../packages/core/src/shared/infrastructure/openapi/generator.ts)
  — builds a spec via `zod-to-json-schema` from the DTO zod schemas. **Covers only
  9 of ~60 paths.** Not served anywhere, not written to disk.
- `openapi/registry.ts` — an `@asteasolutions/zod-to-openapi` registry singleton that
  `generator.ts` deliberately **does not use** (webpack multi-zod-instance issue).
  Decide: keep or delete.

## The core decision (blocks everything else)

**Which layer is the single source of truth?** Two coherent end-states:

- **Option A — generate from the route validators (recommended).** Add a
  `toJsonSchema()` method to the `Schema<T>` interface
  (`packages/core/src/shared/domain/interfaces/validation-service.interface.ts`) and
  implement it in `zod-validation.service.ts` by running `zod-to-json-schema` on the
  wrapped zod schema. Then the generator iterates the **actual `v.object` route
  schemas** — zero duplication, the validator *is* the spec. Keeps the DDD
  ValidationService abstraction intact.
- **Option B — generate from DTO zod schemas + make routes validate via them.**
  Convert every route `v.object(...)` to import and `.parse()` the DTO zod schema.
  More churn and it undoes the ValidationService abstraction; not recommended.

Everything below assumes **Option A** unless decided otherwise.

## Tasks

### T1 — Expose JSON Schema from the validation abstraction 🔴
- Add `toJsonSchema(): Record<string, unknown>` to `Schema<T>` and `ValidationService`.
- Implement in `zod-validation.service.ts` via `zodToJsonSchema(this.zodSchema, {target:'openApi3'})`.
- This is the unlock: without it, route `v.object` schemas can't feed the generator.

### T2 — Schema/path registry 🔴
- Replace the hardcoded `paths`/`schemas` literal in `generator.ts` with a registry
  every router contributes to (path + method + tags + security + request/response
  schema refs). `registry.ts` is a starting point — or roll a plain map.
- Decide registry.ts (`@asteasolutions/zod-to-openapi`) vs the current
  `zod-to-json-schema` approach and remove the unused one.

### T3 — Response envelope 🔴
- Every endpoint wraps payloads in the `{ success, data, timestamp }` envelope
  (`response.util.ts`); list endpoints add `meta.pagination`. The generator must wrap
  response schemas accordingly (the hand spec models this as `ApiSuccessResponse` /
  `ApiPaginatedResponse` — port that).

### T4 — Consolidate the duplicated webhook schema 🟡
- `sensorWebhookSchema` (raw zod, `iot.router.ts:448`) and
  `TemperatureWebhookInputSchema` (`device.schemas.ts:64`) define the **same** body
  twice — the proven drift point. Make the route validate with the single canonical
  schema (under Option A, move it into the ValidationService form).

### T5 — Normalize validation usage 🔴
- `iot.router.ts` uses **raw `z.object`** for `sensorWebhookSchema`, `logsSchema`,
  `logEntrySchema`, while every other router uses the `v` ValidationService. Pick one
  path so the generator has a uniform source.

### T6 — Cover all routers (the zod inventory) 🔴
Per-router request schemas that need a generator entry (and a response schema, mostly
missing today). ✅ = already has a DTO/generator entry; 🔴 = needs one.

- **auth.router.ts** — ✅ login, register · 🔴 refresh, changePassword, createApiKey,
  verify-2fa, sessions (list/delete), logout, password
- **devices.router.ts** — ✅ claim, activate, register(preregister) · 🔴
  listDevicesRegistration, deviceRegister, bulkDevice, tailscaleRegister,
  createCommand, sshCommand, deviceSettings + sub-resources (alerts, commands, logs,
  metrics, settings, ssh, status, rotate-key, request-ota)
- **iot.router.ts** — ✅ /webhook/temperature (TemperatureWebhookInput) · 🔴
  heartbeat, register, logs (+ resolve T4/T5)
- **monitoring.router.ts** — 🟡 createAlert (DTO `CreateAlertInput` exists) · 🔴
  alertAction, createThreshold, updateThreshold, batchAlert, trend, metrics, reports
- **admin.router.ts** — ✅ preregister(devices) · 🔴 stats, users, approve, system,
  customers CRUD, logs
- **users.router.ts** — 🔴 createUser, updateUser, updateProfile, updatePreference,
  pushToken, profile, notification-preferences
- **settings.router.ts** — 🔴 profileSettings, securitySettings, notificationsSettings,
  system
- **notifications.router.ts** — 🔴 list, {id}, retry (likely no bodies — paths + responses only)

DTO files today: `device.schemas.ts` (10), `alert.schemas.ts` (2), `user.schemas.ts`
(4), `common.schemas.ts` (1). Everything not in that set needs a schema exposed.

### T7 — Serve + publish + drift guard 🔴
- Serve the generated spec at `GET /api/openapi.json` (and optionally Swagger UI).
- `make openapi` writes `docs/openapi.yml` from the generator.
- CI check: regenerate and fail if it differs from the committed file (so drift can't
  reappear). Optionally a contract test asserting the documented webhook body matches
  the validator, like the alert-pipeline test.
- Once green, **retire hand-editing** of `openapi.yml` and fix the README wording.

## Suggested first cut (proves the pattern without doing all 60)

T1 + T4/T5 on the **webhook endpoint** (the one already validated end-to-end) + serve
`/api/openapi.json`. That demonstrates "route validator → generated spec" for one real
endpoint; T6 then proceeds incrementally — wire each endpoint's schema and delete its
hand-written `openapi.yml` section as you go.
