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

### T9 — Swap `openapi.yml` → generated + regenerate FE client ✅ done
The hand-maintained `docs/openapi.yml` has been **retired**; the Angular client is now
generated from the spec. How it works:
- **Two generation modes** (`registry.buildPaths({unwrap})`):
  - `/api/openapi.json` + `docs/openapi.generated.json` — **enveloped** (accurate wire
    shape, for external consumers).
  - `/api/openapi-client.json` + `docs/openapi.client.json` — **unwrapped** (the HTTP
    interceptor strips `{success,data,timestamp}`); `ng-openapi-gen` reads this.
- **operationIds** from `operation-ids.ts` keep the generated function names stable.
- **Response models** (`response-schemas.ts`) ported from the handlers; a few endpoints
  the FE reads via `res.data.…` keep the envelope via `clientWrap: true` (auth
  login/register/refresh/2FA/me, sessions). `requestOptional` marks body-less calls
  (refresh).
- **Two real bugs surfaced + fixed:** `createUser`/`updateUser` validators were missing
  `READONLY` role and `SUSPENDED` status that the Prisma enums + FE already use.

**Result:** `make ng-api-generate` from `docs/openapi.client.json` → FE app + spec
type-check **0 errors**, lint clean, **541/541 tests pass**. `make openapi-client`
rewrites the codegen spec; `make ng-api-check` guards client drift.

## Known limitations / tech debt

### T10 — Response models are hand-maintained (can drift from handlers) 🔴
Requests are derived from the runtime validators, so they cannot drift. **Responses
cannot** be derived the same way — responses aren't validated at runtime, so
`apps/backend/src/openapi/response-schemas.ts` is a hand-written JSON-Schema layer
ported from the handlers' `send.ok` payloads. The drift guards only check
*generated == committed*, **not** *generated == what the handler actually returns*. So a
handler that changes its response shape won't be caught.
- Fix (bigger refactor): give each handler a typed response DTO (the value it returns)
  and generate the response schema from that type, closing the loop.
- Also: `response-schemas.ts` `obj()` defaults all fields optional — use `objR(...,
  [required])` and correct enum types, or PUT-from-GET calls break (see the
  ProfileSettings/Security/Notifications fixes). `operation-ids.ts` is a static map —
  new endpoints need an entry or they get fallback names.

#### T10 execution recipe (per entity — do ONE bounded context at a time)
register-routes safely mixes Zod-derived (`toJson(schema)`) and hand-written (`R.X`)
schemas, so a half-migrated state never breaks. For each entity:
1. **Find the real shape:** read the actual response builder (mapper like `alertToDTO`,
   or the inline object the route `send.ok`s). That — not the existing schema — is truth.
2. **Define/align the Zod schema** in the context's `*.schemas.ts` to match the builder
   **exactly** (field presence, nullability, enums). Add `z.infer` type.
3. **Type the builder's return** as that inferred type → tsc now fails if the handler
   drifts (this is the "closed loop").
4. **Wire register-routes** to `toJson(ctx.XResponseSchema)`; delete the entry from
   `response-schemas.ts`.
5. **Regenerate** (`make openapi-client` → `make ng-api-generate`), then **diff the
   client model**: additive changes (new optional fields, widened nullability) are safe;
   **removed fields or narrowed enums break the FE** — reconcile before committing.
6. tsc (backend+FE) + lint + 536 tests + `make ng-api-check`.

#### Landmines already found (must be resolved during migration, not assumed)
- **The existing Zod response schemas have already drifted** from the hand schemas /
  client — `AlertResponseSchema` and `DeviceResponseSchema` exist but do NOT match
  `R.Alert`/`R.Device`. Treat them as untrusted; re-derive from the builder.
- **Alert** (`alertToDTO`): real output has `deviceId: string|null` (R.Alert says
  required), plus `source` and `updatedAt` that no schema has; `AlertResponseSchema`
  is missing `acknowledgedAt`+`metadata` (FE ack logic needs them) and wrongly adds
  `customerId` (the builder doesn't return it).
- **Alert `type` enum is incomplete:** client/schemas list HIGH_CPU/HIGH_MEMORY/
  HIGH_TEMPERATURE/DISK_SPACE/DEVICE_OFFLINE/SECURITY_ALERT/CUSTOM, but handlers also
  create `LOW_BATTERY`, `LOW_DISK_SPACE`, `APPLICATION_ERROR`. The enum must be widened
  (touches the AlertType domain VO + common.schemas + FE display/icon maps) — a
  cross-cutting change, do it deliberately.
- **`type` fields are computed as `string`** in builders (`x?.getValue() || 'CUSTOM'`),
  so typing against a `z.enum` needs a cast (`as XResponse['type']`) — acceptable, but
  it weakens that one field's loop check.
- **Envelope:** some GETs registered `paginated`/`clientWrap` don't return `data` as a
  bare array (e.g. thresholds returns `{thresholds:[…]}`); verify the wire shape vs the
  registered envelope when migrating, or the client unwrap breaks.

#### Suggested rollout order (smallest blast radius first)
auth/user (already partly Zod) → settings (already objR-tightened) → customer →
monitoring (Alert/Threshold/Metrics — resolve the type-enum landmine here) → device
(largest: Device/Command/Settings/Logs/Metrics). Best run as a dedicated focused
effort (or an opt-in multi-agent workflow), one context per commit, FE-client diff
reviewed each time.

### Response key casing — camelCase (decided)
Response keys are **camelCase** (`deviceId`, `cpuThreshold`, `acknowledgedAt`…), with 3
legacy snake_case exceptions kept to match the handlers (`_count`, `total_points`,
`processed_points`). This is intentional and the right fit for an all-TypeScript stack:
Prisma returns camelCase, the backend returns it unchanged, and the Angular client
consumes it as idiomatic TS objects with **no conversion layer**. Switching responses to
snake_case would be a breaking change (renames every generated model property → the FE,
integrations, and firmware response-reads break) for no functional gain, so we keep
camelCase. Note the system is mixed *by layer* on purpose: the **IoT device-agent
requests** (`/iot/heartbeat`, `/iot/register`) are snake_case to match the firmware.
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
