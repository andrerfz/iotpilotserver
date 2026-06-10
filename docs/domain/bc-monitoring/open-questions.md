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
