# bc-device — Open Questions

## Q1 _resolved_ — API key rotation: device re-auth flow

**Decision:** When `RotateApiKey` is called, the old API key is immediately invalidated. The device goes OFFLINE until it reconnects with the new key. The new key is returned in the HTTP response to the admin who triggered rotation (not via event). The device must be manually reconfigured with the new key (physical access or via existing SSH session before the key expires).

**Resolved:** 2026-06-09
**Applies to:** `RotateApiKey` command

---

## Q2 _resolved_ — DeviceSettings: separate table or device fields?

**Decision:** Device settings are stored in the `device_settings` table (confirmed by migration `015_add_device_settings_preference_category.sql`). Settings are loaded separately from the Device entity. `GET /api/devices/:id/settings` already works via direct Prisma. `UpdateDeviceSettings` formalises this as a command but the existing route behavior is correct.

**Resolved:** 2026-06-09
**Applies to:** `UpdateDeviceSettings`, `GetDeviceSettings`

---

## Q3 _resolved_ — Sensor vs system device threshold fields

**Decision:** `isSensorDevice(deviceType)` in `device-type.vo.ts` determines which threshold fields apply:
- Sensor devices (ESP32, Heltec): `sensorTempThreshold`, `batteryThreshold`
- System devices (Raspberry Pi, Orange Pi): `cpuThreshold`, `memoryThreshold`, `temperatureThreshold`, `diskThreshold`

`UpdateDeviceSettings` handler must validate according to device type. The frontend already branches on `isSensorDevice()`.

**Resolved:** 2026-06-09
**Applies to:** `UpdateDeviceSettings`, `DeviceSettings` sub-entity

---

## Q4 _resolved_ — Agent Status: inferred from device status

**Decision:** `agentStatus` does not exist in the Prisma schema or anywhere in the device code. Option A: infer from `device.status`. If `ONLINE` → agent is running. The hardcoded "Running" chip in `DeviceSettingsPage` should be replaced with a `<StatusBadge status={device.status} />` or removed entirely. No heartbeat schema change needed.

**Resolved:** 2026-06-09
**Applies to:** `DeviceSettingsPage.tsx` — remove hardcoded chip, use `device.status`

---

## Q5 _resolved_ — Claiming token: format from existing code

**Decision:** Already defined in `claim-device.handler.ts`. Format: `XXXX-XXXX` — two groups of 4 uppercase alphanumeric chars (charset excludes ambiguous chars O, I, 0, 1), separated by a hyphen. Total: 9 chars displayed, 8 significant chars.

`ClaimingToken` VO: non-empty string matching `/^[A-Z2-9]{4}-[A-Z2-9]{4}$/`.

**Resolved:** 2026-06-09
**Applies to:** `ClaimingToken` VO constraints
