# bc-device — Commands and Queries

## Existing commands (do not re-scaffold)

| Command | Notes |
|---|---|
| `RegisterDevice` | creates Device record |
| `RegisterDeviceComplete` | finishes two-phase registration |
| `ActivateDevice` | UNCLAIMED → ONLINE via claiming token |
| `ClaimDevice` | authenticated user claims an UNCLAIMED device |
| `DeactivateDevice` | ONLINE → OFFLINE/MAINTENANCE |
| `UpdateDevice` | hostname, location, SSH credentials, etc. |
| `RemoveDevice` | soft delete |
| `ExecuteSshCommand` | runs SSH command on device |
| `ProcessHeartbeat` | ingests device heartbeat (CPU, memory, disk, temp) |
| `RecordSensorReading` | ingests ESP32/sensor webhook reading |
| `BulkRegisterDevices` | admin bulk pre-registration |
| `ProvisionDevice` | sets up device config post-claim |
| `MarkStaleDevicesOffline` | scheduled job — sets stale devices to OFFLINE |

## Existing queries (do not re-scaffold)

| Query | Notes |
|---|---|
| `GetDevice` | by internal id |
| `GetDeviceStatus` | connectivity + optional latest metrics |
| `GetDeviceMetrics` | time-series metrics from InfluxDB |
| `GetDeviceCommand` | single command by id |
| `ListDevices` | paginated, tenant-scoped, with status filter |
| `SearchDevices` | full-text search |

---

## New commands (need scaffolding)

### RotateApiKey
Generates a new API key for the device, invalidates the old one. The device must re-register with the new key on its next heartbeat cycle.

- **Inputs:** `deviceId: DeviceId`, `customerId: CustomerId`, `requestedBy: UserId`
- **Emits:** `DeviceApiKeyRotatedEvent`
- **Invariant:** Device must exist and belong to `customerId`. Device must not be UNCLAIMED.
- **Side effect:** Invalidates any existing API key associated with this device. Device will go OFFLINE until it reconnects with the new key.
- **Route:** `POST /api/devices/:id/rotate-key`
- **Auth:** ADMIN role required

### UpdateDeviceSettings
Saves per-device monitoring/threshold/agent configuration. Currently the settings router writes directly to Prisma; this command formalises the domain path.

- **Inputs:** `deviceId: DeviceId`, `customerId: CustomerId`, `settings: DeviceSettingsDto`
- **Emits:** `DeviceSettingsUpdatedEvent`
- **Invariant:** All threshold values must be within valid ranges per their VO constraints. `reportingInterval` only applies to sensor devices; `heartbeatInterval` only applies to non-sensor devices.
- **Route:** `PUT /api/devices/:id/settings` (already exists; this command formalises it)
- **Note:** isSensorDevice(deviceType) determines which threshold fields are validated — see `device-type.vo.ts`

---

## New queries (need scaffolding)

### GetDeviceSettings
Returns the current settings for a device, merging DB values with defaults.

- **Inputs:** `deviceId: DeviceId`, `customerId: CustomerId`
- **Returns:** `DeviceSettingsDto`
- **Route:** `GET /api/devices/:id/settings` (already exists via router; this query formalises it)

---

## Frontend gaps (no new endpoints needed — UI fixes only)

### Admin Devices page
- `GET /api/admin/devices` exists but **no frontend page calls it**
- The admin sidebar links to `/admin/devices` which calls `GET /api/devices` (tenant-scoped) instead of `/api/admin/devices` (all tenants, SUPERADMIN only)
- Fix: `admin/devices/page.tsx` should call `/api/admin/devices` when `isSuperAdmin`, `/api/devices` otherwise

### Device Settings — "Rotate API Key" button
- Currently calls `toast.info('contact your administrator')` — dead button
- Fix: call `POST /api/devices/:id/rotate-key` once the command is scaffolded

### Device Settings — Agent Status chip
- Currently hardcoded `"Running"` chip
- Fix: `GET /api/devices/:id/status` returns `agentStatus` — use that field, or remove the chip

---

## Sensitive operations
| Command | Requires |
|---|---|
| `RemoveDevice` | ADMIN role |
| `BulkRegisterDevices` | SUPERADMIN role |
| `RotateApiKey` | ADMIN role |
| `ExecuteSshCommand` | device must have `sshEnabled = true` |
| `RecordSensorReading` | device API key auth (no JWT) |
| `ProcessHeartbeat` | device API key auth (no JWT) |
