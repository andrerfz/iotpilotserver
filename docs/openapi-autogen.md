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

### T1 — Expose JSON Schema from the validation abstraction ✅
- Added `toJsonSchema(): Record<string, unknown>` to the `Schema<T>` interface and
  implemented it in `zod-validation.service.ts` (`wrapSchema`) via
  `zodToJsonSchema(zodSchema, {target:'openApi3'})`. Every `v.*` schema can now emit
  its OpenAPI JSON Schema — the unlock for generating from route validators (T2/T6).

### T2 — Schema/path registry ✅
- `registry.ts` is now a self-contained `OpenApiRegistry` (no `@asteasolutions`):
  `registerSchema()` / `registerPath()` / `buildPaths()`, storing plain JSON Schema.
  It accepts either a raw JSON Schema **or** anything with `toJsonSchema()` — so a
  route's own `v.*` validator can register itself (the T6 mechanism).
- `generator.ts` is now thin: it returns `buildPaths()` + `getSchemas()` from the
  registry. Endpoints are declared in `registrations.ts` (central for now; ~13
  operations across 11 paths, up from 8).

### T3 — Response envelope ✅
- `successEnvelope()` / `paginatedEnvelope()` in `registry.ts` wrap every response in
  `{ success, data, timestamp }` (paginated lists add `meta.pagination`), matching
  `response.util.ts`. Each registration picks `envelope: 'success' | 'paginated' |
  'none'`.

### T4 — Consolidate the duplicated webhook schema ✅
- `TemperatureWebhookInputSchema` (`device.schemas.ts`) is now the single canonical
  body and was corrected to match the real validator (readings optional;
  `cycle`/`offsetSeconds` optional; added `batteryVoltage`/`sensorError`/`batteryLow`).
  `iot.router.ts` imports it instead of redefining `sensorWebhookSchema`. The
  `TemperatureWebhookResponseSchema` was also fixed to the real response payload.
  Verified by `scripts/test-alert-pipeline.sh` (19/19, validation unchanged) and the
  served `/api/openapi.json`.

### T5 — Normalize validation usage 🟡
- Webhook done (now validates via the canonical schema). Still raw `z.object` in
  `iot.router.ts`: `logsSchema`, `logEntrySchema` (and `heartbeatSchema` /
  `iotDeviceRegistrationSchema` use `v`). Converge these when T6 reaches the `/iot/*`
  endpoints.

### T6 — Cover all routers (the zod inventory) ✅

**Registration lives in the app layer** (`apps/backend/src/openapi/register-routes.ts`),
not core — core must not depend on app routes (dependency points app → core). That
file imports the registry + core DTO schemas + each router's exported `v.*`/zod
validators and registers every endpoint; `generator.ts` just reads the populated
registry. A route's own validator becomes its request schema via `toJsonSchema()`
(`v.*`) or `zodToOpenApi()` (raw zod) — no duplicate schema, no drift.

**Done — all 8 routers:** Auth 14, Devices 26, IoT 5, Admin 11, Monitoring 13,
Users 12, Settings 9, Notifications 4 = **94 operations / 64 paths / 40 schemas**, at
parity with the hand-maintained `openapi.yml` (66 paths). Request bodies derive from
the route validators. Not yet registered: `/health`, `/schedule` (trivial, no body) —
fold in with T7.

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

### T7 — Serve + publish + drift guard ✅ (safe scope)
- ✅ Served at `GET /api/openapi.json` (`routes/index.ts` → `generateOpenApiSpec()`).
- ✅ `make openapi` writes the generated spec to the tracked `docs/openapi.generated.json`
  (deterministic — regenerating produces no diff).
- ✅ `make openapi-gen-check` fails if the committed artifact drifts from the served
  spec (CI/pre-push guard; requires the dev backend running with current source).
- Note: this is a **separate artifact** from `docs/openapi.yml` (the FE client source).
  Replacing `openapi.yml` is gated on T8 (see below).

**Blocker for "replace `openapi.yml`":** `docs/openapi.yml` is the INPUT to
`ng-openapi-gen` (`make ng-api-generate` → the typed FE client under
`apps/frontend-ng/src/app/core/api/generated`, imported by ~63 files). The generated
spec is request-accurate but **thin on responses** (~half the GETs have no response
schema), so regenerating the client from it would drop response types and break FE
code. **Do not replace `openapi.yml` until T8.** Safe now: publish the generated spec
as a separate tracked artifact + drift guard; keep `openapi.yml` feeding the client.

### T8 — Response DTO schemas for all endpoints ✅ (gates the replace)
Author response DTOs (or register inline response schemas) for the endpoints that lack
them, so the generated spec matches the hand spec's response coverage. Only then can
`make openapi` overwrite `docs/openapi.yml`, regenerate the FE client safely, and the
hand spec be retired.

**✅ Response coverage complete — 0 of 96 operations missing a response schema.**
- Shared `MessageResponse` for acknowledgement endpoints (deletes, logout, password,
  retry, request-ota, push-token, logs).
- Response models in `apps/backend/src/openapi/response-schemas.ts` (plain JSON Schema,
  ported from the handlers / legacy `openapi.yml`): User, Session, AuthData, ApiKey,
  DeviceCommand, DeviceSettings, DeviceStatusInfo, Threshold, DeviceLogEntry,
  MetricPoint, DeviceMetrics, MonitoringMetrics, SshResult, NotificationRecord,
  ProfileSettings, SecuritySettings, SystemSettings, NotificationSettings, AdminStats,
  SystemInfo, Customer, HeartbeatResponse, BulkResult, etc. (71 schemas total).

### T9 — Swap `openapi.yml` → generated + regenerate FE client 🔴 (the actual cutover)
Coverage is done, but a **drop-in** replacement of the `ng-openapi-gen` source needs
reconciliation first, or the regenerated client will differ:
- Model-name alignment: the generated spec has both the lean `DeviceResponse` (used by
  list/get) and the rich `Device` (detail fields). Point device list/get at the rich
  model (or merge) so detail typing isn't lost; align other names with what the FE
  imports today.
- Then: emit the generated spec as `docs/openapi.yml` (needs a YAML writer — host has
  one via the codegen toolchain), run `make ng-api-generate`, review the client diff,
  fix FE type usages, and run `make ng-api-check`.
- This is FE-affecting (the generated client is imported by ~63 files) — do it
  deliberately with the diff in front of you, not blindly.
- CI check: regenerate and fail if it differs from the committed file (so drift can't
  reappear). Optionally a contract test asserting the documented webhook body matches
  the validator, like the alert-pipeline test.
- Once green, **retire hand-editing** of `openapi.yml` and fix the README wording.

## Progress — T1–T5 + T2/T3 done, served live

Done: T1 (validators emit JSON Schema), T2 (self-contained registry), T3 (response
envelopes), T4 (canonical webhook schema), T5 (webhook normalized). The generated spec
is served at `/api/openapi.json` with ~13 operations across 11 paths, all
envelope-wrapped. Remaining:

- **T6** — coverage of the remaining ~47 endpoints. Move registrations from the central
  `registrations.ts` to **per-router** declarations using each route's `v.*` validator
  (`toJsonSchema()`), exporting/relocating route schemas as needed. Delete each
  endpoint's hand-written `openapi.yml` section as it's covered.
- **T7 (rest)** — `make openapi` to write `docs/openapi.yml` from the generator + a CI
  guard that fails when committed ≠ generated.
