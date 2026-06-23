> ⚠️ **OBSOLETO / ARCHIVADO.** Registro puntual del trabajo de provisioning
> (abril 2026), con rutas pre-monorepo (`app/src/lib/`, `app/prisma/`). Las
> tareas descritas están completadas. Se conserva como historial.
> Diseño vigente del provisioning: [`docs/iot-provisioning-architecture.md`](../iot-provisioning-architecture.md).

# Device Provisioning Task Log

## Context

Building ESP8266 temperature sensor provisioning flow. Devices are pre-registered at manufacturing (UNCLAIMED), claimed by customers via app (PENDING_SETUP), then activated by the device firmware (OFFLINE → ONLINE).

Device lifecycle: `UNCLAIMED → PENDING_SETUP → OFFLINE → ONLINE`

---

## Completed Work

### 1. Schema changes (`app/prisma/schema.prisma`)
- Added `UNCLAIMED` and `PENDING_SETUP` to `DeviceStatus` enum
- Made `devices.customerId` nullable (`String?`) — UNCLAIMED devices have no customer
- Added `metadata Json? @default("{}")` to Device model — stores claiming token

### 2. Migrations
- `app/prisma/migration/003_device_claiming_support.sql` — adds UNCLAIMED/PENDING_SETUP enum values, adds metadata JSONB column with GIN index
- `app/prisma/migration/004_nullable_device_customer.sql` — drops NOT NULL on `devices.customerId`

### 3. Claim endpoint (`POST /api/devices/claim`)
- File: `app/src/app/api/devices/claim/route.ts`
- JWT-authenticated. Finds UNCLAIMED device by deviceId, assigns to customer/user, writes one-time claiming token (XXXX-YYYY format, 15-min TTL) into `device.metadata`, transitions to PENDING_SETUP.
- Handler: `app/src/lib/device/application/commands/claim-device/claim-device.handler.ts`
- **Critical fix**: handler was writing token to `device.capabilities` instead of `device.metadata` — fixed.
- **Critical fix**: added `static readonly type = 'ClaimDeviceCommand'` — required for minification-safe command bus dispatch.

### 4. Activate/provision endpoint (`POST /api/devices/activate`)
- File: `app/src/app/api/devices/activate/route.ts`
- Public endpoint (no auth). Device firmware calls this with claiming token + MAC/IP.
- Validates token from `device.metadata`, generates permanent `iotp_sensor_*` API key, stores in `api_keys` table, transitions device to OFFLINE.
- Returns `{ apiKey, webhookUrl, config: { reportingInterval: 7200, deepSleepEnabled: true } }`
- Handler: `app/src/lib/device/application/commands/provision-device/provision-device.handler.ts`
- **Critical fix**: handler was reading token from `device.capabilities` instead of `device.metadata` — fixed.
- **Critical fix**: added `static readonly type = 'ProvisionDeviceCommand'` — same minification issue as above.

### 5. Pre-registration script (`scripts/preregister-devices.ts`)
- Batch-inserts UNCLAIMED devices for manufacturing use
- Generates `IOT-XXXX-YYYY` format IDs (charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, no ambiguous chars)
- Collision check against existing deviceIds
- Outputs CSV of `deviceId,registeredAt`
- Usage: `npx ts-node scripts/preregister-devices.ts --count=50 --output=devices.csv`
- Reads `.env.local` automatically

### 6. TypeScript fixes after making `customerId` nullable
- `process-heartbeat.handler.ts` — `checkAlertConditions` signature changed to `customerId: string | null`, added `if (!customerId) return;` guard
- `record-sensor-reading.handler.ts` — alert block now guarded: `if (... && device.customerId)`, uses `const alertCustomerId = device.customerId` for narrowing; passes `customerId: alertCustomerId` (guaranteed string)
- `device.entity.ts` — `constructor` and `static create()` now accept `CustomerId | null`, pass `customerId ?? undefined` to `super()`
- `device.mapper.ts` — `persistence.customerId` now null-checked before `CustomerId.fromString()`
- `telegraf-metrics-collector.service.ts` — 3 instances of `CustomerId.create(device.customerId)` now null-guarded: `device.customerId ? CustomerId.create(device.customerId) : CustomerId.create('unknown')`

### 7. Sensor reading endpoint
- `POST /api/webhook/temperature` — receives readings from firmware, stores as `DeviceMetric` rows, creates alerts if `alertPending: true` and device has a customer
- Handler: `app/src/lib/device/application/commands/record-sensor-reading/record-sensor-reading.handler.ts`
- Added `static readonly type = 'RecordSensorReadingCommand'`

### 8. OpenAPI + Swagger UI (Phase 1)
- Auto-generated OpenAPI 3.0 spec from Zod DTO schemas
- Swagger UI served at `/api/docs`
- DTO schema files: `common.schemas.ts`, `device.schemas.ts`, `user.schemas.ts`
- Each DTO exports raw Zod schemas (for OpenAPI) AND inferred TypeScript types (for frontend)

### 9. Reusable UI Components (Phase 2)
- Extracted 5 shared components into `app/src/components/ui/`:
  - `StatusBadge` — device/command status chip (replaced 4 copies of getStatusColor/getStatusBadge)
  - `SeverityBadge` — alert severity badge (replaced 2 copies)
  - `DeviceTypeBadge` — device type label
  - `MetricCard` — stat box with icon/value/label (replaced 8 duplicated cards)
  - `EmptyState` — "no data" placeholder (replaced 4 patterns)
- Refactored 7 consumer files to use new components (~120 lines of duplication removed)

### 10. Frontend Decoupled from Backend (Phase 3)
- Created `app/src/types/enums.ts` — frontend-safe string unions + `hasRole()` utility
- Created `app/src/types/api.ts` — re-exports all Phase 1 DTO types
- Replaced `Command`/`Query` abstract class imports in hooks with `Record<string, unknown>`
- Removed all domain command/query class imports from 9 hook files
- `protected-route.tsx` — replaced `UserRole` VO with `hasRole()` from `types/enums`
- `auth-context.tsx` — replaced `UserRoleType` with `UserRole` from `types/enums`
- `AlertCard.tsx` — replaced `AlertEntity` domain import with plain interface, removed all `as any` casts
- **Boundary rule verified**: no `@/lib/*/domain/` or `@/lib/*/application/` imports in client-side files

### 11. Auto-Resolving Command Bus
- Added `registerHandlers(ctx)` method to `BoundedContextProvider` interface
- Moved handler registrations from central `service-container.ts` into 4 bounded context providers:
  - `UserServiceProvider` — 8 handlers
  - `DeviceServiceProvider` — 16 handlers (including lazy SSH)
  - `MonitoringServiceProvider` — 2 handlers
  - `CustomerServiceProvider` — 2 handlers
- `service-container.ts` shrunk from 309 → 130 lines, registerHandlers() is now a 10-line loop
- Adding a new handler only requires editing the relevant context's provider

### 12. Fixed Admin User Management
- `/admin/users` — rewrote to use `apiCall` from auth context, fetches from `GET /api/users`, activate/suspend via `PUT /api/users/[id]`
- `/admin/users/new` — cleaned up dead edit code, create calls `POST /api/users` via `apiCall`
- Added `listUsers` to `useUserQueries` hook
- Added optional `method` parameter to `useCommand` hook (supports PUT/DELETE)
- Guard: activate/suspend/add-user buttons only show for SUPERADMIN (matching API permissions)

### 13. Fixed All Broken Frontend Features (2026-04-21)
- **Settings > Profile** — was infinite spinner. Now fetches from `GET /api/settings/profile`, save works via `PUT /api/settings/profile`
- **User menu "Admin Panel"** — was no-op. Now navigates to `/admin`. Shows for both ADMIN and SUPERADMIN
- **User menu "Debug Info"** — was empty. Now shows env/user/tailscale info
- **Admin sidebar platform links** — were dead 404 links. Now disabled with "Soon" badges
- **Admin logs page** — added `credentials: 'include'` to fetch
- **Admin system page** — same auth fix
- **Security page 2FA/sessions** — changed confusing stubs to "Coming Soon" labels
- **Admin dashboard** — replaced empty cards with Quick Links + System Status summary
- **Settings /help link** — pointed to `/api/docs` instead of nonexistent `/help`
- **Malformed comment** — cleaned up leftover import remnant in `user-menu.tsx`

---

## Current State

**All items verified (2026-04-21):**
- Build passes: lint 0 errors, type-check clean (4 pre-existing only), 96/96 unit tests pass
- Full E2E provisioning flow verified (preregister → claim → activate → sensor reading → alert)
- Frontend fully decoupled from backend domain layer
- All previously broken UI features are functional
- OpenAPI spec + Swagger UI at `/api/docs`

---

## Pending / Next Steps

### Production readiness
- [ ] **Cloudflare WAF bypass** — Create rule to skip bot protection for `/api/devices/activate` and `/api/webhook/temperature`
- [ ] **Low battery email/push notification delivery** — Alert is created in DB but no email or push notification sent yet

### Medium priority
- [ ] **Alert resolution** — currently alerts are created but never auto-resolved when temp drops back to normal. Add resolution logic in `record-sensor-reading.handler.ts`.
- [ ] **Sensor reading deduplication** — the `cycle` number from firmware is not stored; readings have no ordering beyond DB insert time.

### Low priority
- [ ] `telegraf-metrics-collector.service.ts` — the `CustomerId.create('unknown')` fallback is a hack. UNCLAIMED devices shouldn't hit this code path but it should be cleaner.
- [ ] `device.mapper.ts` `toDto()` throws if `customerId` is null — fine for now since UNCLAIMED devices are never returned to regular users, but worth documenting.
- [ ] 4 pre-existing TypeScript errors in `DeviceAlertsPage.tsx` and `DeviceSettingsPage.tsx` — `getDeviceData.name` possibly null / `.value` property access on object type.

---

## Key Architecture Notes

### Command bus dispatch (minification-safe)
Every command class **must** have `static readonly type = 'ExactCommandName'`. The `InMemoryCommandBus` uses this string as the Map key, not `constructor.name` (which gets minified in Next.js production builds). Missing this = wrong handler executes silently.

### Handler registration (per-context providers)
Handler registration is distributed across bounded context providers. Each provider implements `registerHandlers(ctx)` which receives `{commandBus, queryBus, eventBus, container}`. To add a new handler:
1. Create command + handler files in the bounded context
2. Add registration line in the context's provider (e.g., `DeviceServiceProvider.registerHandlers()`)
3. No changes needed in `service-container.ts`

### Token storage
Claiming token is stored in `device.metadata` (JSONB), not `device.capabilities`. Fields:
```json
{
  "claimingToken": "XXXX-YYYY",
  "claimingTokenExpiresAt": "2026-04-16T12:00:00.000Z",
  "claimingTokenUsed": false,
  "claimedBy": "<userId>",
  "claimedAt": "2026-04-16T11:45:00.000Z"
}
```

### Alert constraint
`Alert.customerId` is required (non-nullable) in the schema. Never attempt to create an alert for an UNCLAIMED device (no customerId). Always guard: `if (!device.customerId) return;` before alert creation.

### Frontend-backend boundary
Frontend files (`components/`, `hooks/`, `contexts/`, client pages) must NOT import from `@/lib/*/domain/` or `@/lib/*/application/`. Use `@/types/api.ts` and `@/types/enums.ts` for shared types. Server components and API routes can import domain freely.

### Port mapping
App runs on host port **3001** (mapped to container port 3000). Not 3000.
