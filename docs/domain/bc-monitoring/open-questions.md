# bc-monitoring — Open Questions

## Q1 _resolved_ — UpdateThreshold: exists but no HTTP route

**Decision:** `UpdateThreshold` command and handler exist. The fix is to add `PUT /api/monitoring/thresholds/:id` to `monitoring.router.ts`. No new scaffolding needed — route wiring only.

**Resolved:** 2026-06-09
**Applies to:** `UpdateThreshold` command

---

## Q2 _resolved_ — Alert trend data source

**Decision:** `GetAlertTrend` query uses PostgreSQL (`Alert` table), not InfluxDB. Group alerts by `DATE(createdAt)` for daily counts, optionally filtered by `deviceId`. InfluxDB only stores time-series metrics (CPU, memory, etc.) — alert history lives in Postgres.

**Resolved:** 2026-06-09
**Applies to:** `GetAlertTrend` query

---

## Q3 _resolved_ — Alert Configure modal scope

**Decision:** The "Configure" modal in the device alerts page should create/update the `Threshold` records for the device. It maps to `POST /api/monitoring/thresholds` (create) or `PUT /api/monitoring/thresholds/:id` (update). The modal must first call `GET /api/monitoring/thresholds?deviceId=:id` to check if thresholds already exist before deciding create vs update.

**Resolved:** 2026-06-09
**Applies to:** `CreateThreshold`, `UpdateThreshold`, alert configure modal frontend

---

## Q4 _resolved_ — Batch operations: partial failure behavior

**Decision:** Skip invalid IDs silently — process all valid ones, return `{ processed: N, skipped: M }`. All alertIds are validated against `customerId` at query time (tenant-scoped repository), so cross-tenant access is structurally impossible — no explicit 403 needed. IDs not found or already in terminal state (RESOLVED/DELETED) are counted as skipped.

**Resolved:** 2026-06-09
**Applies to:** `BatchAcknowledgeAlerts`, `BatchResolveAlerts` handlers

---

## Q5 _resolved_ — Threshold per device vs global: UI approach

**Decision:** The Configure modal includes a radio/toggle "This device only" vs "All tenant devices" (`deviceId = device.id` vs `deviceId = null`). Default selection: "This device only". The modal first fetches existing thresholds for `?deviceId=:id` AND `?deviceId=null` to pre-populate. On save: creates/updates the scoped records per the selection.

**Resolved:** 2026-06-09
**Applies to:** Configure modal frontend, `CreateThreshold` / `UpdateThreshold` calls from modal

---

## Q6 _resolved_ — Threshold storage: two disconnected systems

**Problem:** Alert thresholds had two unconnected homes. The device "Configuración"
tab wrote `sensorTempThreshold` / `batteryThreshold` to `UserPreference`
(`device_<internalId>_*`), and the **alert evaluator** (`record-sensor-reading.handler`)
read from there. Meanwhile the "Umbrales" modal read/wrote the dedicated `thresholds`
table — which the evaluator never consulted. So the modal always showed hardcoded
defaults (battery 20 % / sensor 50 °C) and editing it had no effect. The `thresholds`
write-path also had latent bugs: POST stored the route **publicId** in `thresholds.deviceId`
(a FK to `devices.id`) so device-scoped creates FK-failed; GET returned the internal id
so the modal's `deviceId === publicId` filter never matched; and create enforced
**name** uniqueness instead of the real `(deviceId, metricName)` invariant.

**Decision:** The `thresholds` table is the single source of truth.
- `loadThresholds()` reads `thresholds` (metricName `sensor_temp` / `battery`),
  device-scoped row > global (`deviceId = null`) > hardcoded default. Warn/crit split
  is still derived (crit = warn + 5 °C / battery half) to keep the single-value-per-metric
  modal model with the existing escalation behavior.
- POST resolves publicId → internal `devices.id`; GET resolves internal → publicId.
- Create uniqueness is now per `(deviceId, metricName)`, not name.
- The "Umbrales" modal (Alerts tab) is the only UI for alert thresholds. The device
  "Configuración" tab no longer carries threshold fields (operational settings only).
- Existing `UserPreference` thresholds were migrated to `thresholds` rows
  (`apps/backend/prisma/migration/migrate-thresholds-from-preferences.ts`, idempotent).

**Resolved:** 2026-06-28
**Applies to:** `record-sensor-reading.handler`, `create-threshold.handler`,
`monitoring.router` threshold endpoints, device-settings page, threshold migration

**Addendum (2026-06-28):** the heartbeat path (`process-heartbeat.handler`) now reads
the same `thresholds` table for system metrics (`cpu_usage`, `memory_usage`,
`disk_usage`, `temperature`) — device override > global > built-in default — instead
of the hardcoded `> 85` lines, and resolves the alert when the metric recovers (it
previously only created, never resolved). CRITICAL is derived per metric
(`warn + critOffset`). The Settings → "Umbrales por defecto" page manages the global
defaults for these too. So both alert paths (sensor/webhook and system/heartbeat) are
now driven by the single `thresholds` source of truth.
