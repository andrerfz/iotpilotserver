# bc-monitoring — Commands and Queries

## Existing commands (do not re-scaffold)

| Command | Notes |
|---|---|
| `CreateAlert` | manual alert creation |
| `AcknowledgeAlert` | ACTIVE → ACKNOWLEDGED |
| `ResolveAlert` | → RESOLVED |
| `DeleteAlert` | soft delete |
| `CreateThreshold` | `POST /api/monitoring/thresholds` exists |
| `UpdateThreshold` | handler exists — **no HTTP route** |

## Existing queries (do not re-scaffold)

| Query | Notes |
|---|---|
| `ListAlerts` | paginated, with device/severity/status filter |
| `GetAlertDetails` | single alert with threshold info |
| `GetThresholds` | list thresholds |
| `GetSystemMetrics` | system-wide metrics |
| `GenerateReport` | `GET /api/monitoring/reports` |

---

## New commands (need scaffolding)

### BatchAcknowledgeAlerts
Acknowledges multiple alerts in one operation.

- **Inputs:** `alertIds: AlertId[]`, `customerId: CustomerId`, `acknowledgedBy: UserId`
- **Emits:** `AlertAcknowledgedEvent` × N
- **Invariant:** All alertIds must belong to `customerId`. Only ACTIVE alerts are acknowledged; others are silently skipped.
- **Route:** `PUT /api/monitoring/alerts/batch` with `{ action: "acknowledge", alertIds: [...] }`
- **Auth:** authenticated user

### BatchResolveAlerts
Resolves multiple alerts in one operation.

- **Inputs:** `alertIds: AlertId[]`, `customerId: CustomerId`, `resolvedBy: UserId`, `resolutionNote?: ResolutionNote`
- **Emits:** `AlertResolvedEvent` × N
- **Invariant:** All alertIds must belong to `customerId`. Only ACTIVE or ACKNOWLEDGED alerts are resolved; others are silently skipped.
- **Route:** `PUT /api/monitoring/alerts/batch` with `{ action: "resolve", alertIds: [...] }`
- **Auth:** authenticated user

---

## New queries (need scaffolding)

### GetAlertTrend
Returns daily alert counts over a rolling time window. Backs the Analytics tab chart in the device alerts page (currently using `Math.random()`).

- **Inputs:** `customerId: CustomerId`, `deviceId?: DeviceId`, `period: ReportPeriod` (7d \| 30d)
- **Returns:** `Array<{ date: string; count: number; bySeverity: Record<AlertSeverity, number> }>`
- **Route:** `GET /api/monitoring/alerts/trend?deviceId=&period=7d`
- **Auth:** authenticated user
- **Source:** Query the `Alert` table grouped by `DATE(createdAt)` — no InfluxDB needed

---

## Missing HTTP routes for existing commands

### UpdateThreshold
`UpdateThreshold` command and handler exist in code but have **no HTTP route**.

- **Route to add:** `PUT /api/monitoring/thresholds/:id`
- **Auth:** authenticated user
- **Inputs:** `{ metricType, operator, value, severity, enabled, name, description, cooldownMinutes }`

### DeleteThreshold _(new command + route)_
- **Inputs:** `thresholdId: ThresholdId`, `customerId: CustomerId`
- **Emits:** none
- **Invariant:** Soft delete; existing alerts linked to this threshold are NOT deleted
- **Route:** `DELETE /api/monitoring/thresholds/:id`
- **Auth:** ADMIN role

---

## Frontend gaps (UI not connected to existing backend)

### Alert Configuration modal
- **Device alerts page** → Configure button → modal saves nothing (`onPress={onClose}`)
- Fix: modal should call `POST /api/monitoring/thresholds` (create) or `PUT /api/monitoring/thresholds/:id` (update) depending on whether a threshold exists for this device
- The modal currently only has a CPU threshold field — needs all 4 fields (CPU, memory, temp, disk for system devices; temp + battery for sensor devices)

### Analytics tab — Alert Trend chart
- Currently calls `Math.random()` — replace with `GET /api/monitoring/alerts/trend?deviceId=&period=7d`

### Threshold management UI
- No frontend page for managing thresholds at all
- `GET /api/monitoring/thresholds` exists but nothing calls it
- Consider adding a Thresholds section under Admin or under each device's alerts tab

---

## Sensitive operations
| Command | Requires |
|---|---|
| `DeleteAlert` | ADMIN role |
| `DeleteThreshold` | ADMIN role |
| `BatchResolveAlerts` | authenticated user (own tenant) |
| `BatchAcknowledgeAlerts` | authenticated user (own tenant) |
| `CreateThreshold` | authenticated user |
| `UpdateThreshold` | authenticated user (own tenant's threshold) |
