# fe-dashboard — Tasks

Each task is one small PR ≤ 1 dev-day. T1 (service) must land before T2–T4 (pages) and
T5 (sheet). T2, T3, T4, T5 are independent of each other once T1 merges.

## Status

| # | Task | Status |
|---|---|---|
| T1 | DashboardService — listDevices + listAlerts + getMonitoringMetrics signals | done |
| T2 | Dashboard page — fleet overview (KPIs + device table + alerts feed + fleet CPU chart) | done |
| T3 | Devices list page — full fleet table (search + filter + KPIs + DataTable) | done |
| T4 | Monitoring page — alerts DataTable with filters + ECharts alert trend chart | done |
| T5 | RegisterDeviceSheet — claim flow BottomSheet | done |

---

### T1 — DashboardService

- **Does:**
  1. Creates `apps/frontend-ng/src/app/features/dashboard/services/dashboard.service.ts`.
  2. `@Injectable({ providedIn: 'root' })`. Injects `Api` from the generated client.
  3. Exposes three query surfaces, each implemented as a `runQuery()` signal:
     - `devices` — wraps `listDevices` (`GET /devices`). Params: `status`, `search`,
       `page`, `limit`, `sortBy`. Returns the typed `Device[]` array from the 200
       response (after Q1 is resolved and the spec is fixed + regenerated).
     - `alerts` — wraps `listAlerts` (`GET /monitoring/alerts`). Params: `deviceId`,
       `severity`, `status`, `startTime`, `endTime`, `page`, `limit`. Returns `Alert[]`.
     - `monitoringMetrics` — wraps `getMonitoringMetrics` (`GET /monitoring/metrics`).
       Param: `period` (`1h|6h|24h|7d|30d`, default `24h`). Returns the metrics payload.
  4. Each surface exposes: `.data` signal, `.loading` signal, `.error` signal, `.load(params)` method.
  5. Does NOT include real-time socket subscriptions — pages subscribe to `SocketService`
     directly for live updates (avoids service-level coupling to the socket lifecycle).

- **Output:**
  - `services/dashboard.service.ts`
  - `services/dashboard.service.spec.ts` — verifies `listDevices` invokes the generated
    client with correct params; `alerts.data` populates from the mock response.
  - Q1 resolved — `listDevices`, `claimDevice`, `listAlerts`, `getMonitoringMetrics` all have typed responses in the generated client.

- **Invariant:** No direct `Api.invoke` calls in pages or components — all go through
  this service. Service never reaches into `SocketService` — that is a page concern.

---

### T2 — Dashboard page (fleet overview)

- **Does:**
  1. Implements `DashboardPage` at route `/app/dashboard` (also the shell default when
     navigating to `/app`).
  2. On `ngOnInit`: calls `dashboardService.devices.load({})` and
     `dashboardService.alerts.load({ status: 'active', limit: 5 })` and
     `dashboardService.monitoringMetrics.load({ period: '24h' })`.
  3. **KPI row** (4 `MetricCard`s, derived from `devices.data` signal):
     - "Online" — count of `ONLINE` devices / total, spark line from metrics.
     - "Open alerts" — count from `alerts.data`, spark line from alert trend.
     - "Avg CPU" — average `cpuUsage` across online devices from metrics payload.
     - "Ingest rate" — throughput from metrics payload.
  4. **Device table section** (left column in 2-col grid):
     - `SectionHead` with `DevicePicker` and `MultiSelectPicker` for status filter.
     - `DataTable` with columns: Device (name + hardware ID + StatusDot), Status
       (`StatusBadge`), Location, CPU, Temp, Last seen, chevron. `pageSize=6`.
       Row click navigates to `/app/devices/{id}` (wires fe-device-detail).
     - Filters are client-side (filter the signal data); no re-fetch on filter change.
  5. **Right column**:
     - Live alerts feed card: top 5 non-resolved alerts from `alerts.data`, each row
       showing severity bar, title, device·value, age. Real-time `alert:new` socket
       event prepends to the list (subscribe via `SocketService.alerts$`).
     - Fleet CPU chart: `ngx-echarts` line chart of `cpu_usage` time series from the
       metrics payload. `DateRangePicker` controls the `period`; on change calls
       `dashboardService.monitoringMetrics.load({ period })`.
  6. **Register device button** opens `RegisterDeviceSheet` (T5) via
     `UiBottomSheetComponent.present()`.
  7. Real-time device status: subscribes to `SocketService.deviceUpdates$`; on
     `device:update` event updates the matching device row in the local signal (no full reload).
  8. Loading state: skeleton cards while `devices.loading()` or `alerts.loading()`.
     Error state: `EmptyState` with retry button.

- **Output:**
  - `pages/dashboard/dashboard.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.
  - Q3 resolved — `ngx-echarts` + `echarts` installed, `provideEchartsCore` registered in `main.ts`.

---

### T3 — Devices list page

- **Does:**
  1. Implements `DevicesPage` at route `/app/devices`.
  2. On `ngOnInit`: calls `dashboardService.devices.load({ limit: 50 })`.
  3. **KPI row** (4 `MetricCard`s, derived client-side from `devices.data` signal):
     - "Online" — ONLINE count.
     - "Offline / Error" — OFFLINE + ERROR count, warning delta if > 0.
     - "Maintenance / Pending" — MAINTENANCE + UNCLAIMED count.
     - "Firmware current" — count where firmware matches the latest known version
       (static check or from device `firmwareVersion` field).
  4. **Filter bar**: search `IonSearchbar` (filters rows client-side on `hostname`,
     `deviceId`, `location`), `MultiSelectPicker` for status.
  5. **DataTable**: same columns as T2's device table but `pageSize=10` and with
     selectable rows + bulk actions bar ("Export selected", placeholder for future batch
     commands). Row click → `/app/devices/{id}`.
  6. Real-time status updates same as T2 (subscribe `SocketService.deviceUpdates$`).
  7. **Register device** FAB / header button opens `RegisterDeviceSheet` (T5).

- **Output:**
  - `pages/devices/devices.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.

---

### T4 — Monitoring page

- **Does:**
  1. Implements `MonitoringPage` at route `/app/monitoring`.
  2. On `ngOnInit`: calls `dashboardService.alerts.load({})` and
     `dashboardService.monitoringMetrics.load({ period: '24h' })`.
  3. **KPI summary**: total open / acknowledged / resolved counts (derived client-side).
  4. **Filter bar**: `DevicePicker`, `MultiSelectPicker` for severity
     (INFO/WARNING/ERROR/CRITICAL), `MultiSelectPicker` for state
     (active/resolved/acknowledged), `DateRangePicker` for period (calls
     `alerts.load(params)` on change).
  5. **Alerts DataTable** (selectable rows):
     - Columns: Severity (bar + `SeverityBadge`), Alert title + metric·value, Device
       (`StatusDot` + hostname), State (`StatusBadge`), Triggered (age).
     - Bulk actions: "Acknowledge", "Resolve".
     - Calls `PATCH /monitoring/alerts/batch` (`batchUpdateAlerts` operationId) for bulk
       operations; `PATCH /monitoring/alerts/{id}` for single row actions.
  6. **Alert trend chart** (ECharts bar chart): daily alert counts from
     `getAlertsTrend`. Period matches the `DateRangePicker` selection.
  7. "Thresholds" button → navigates to `/app/monitoring/thresholds` (placeholder route,
     not implemented in this module — guarded link, disabled if route doesn't exist yet).

- **Output:**
  - `pages/monitoring/monitoring.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.
  - Q2 + Q3 resolved — alerts and metrics endpoints are typed; ngx-echarts is installed.

---

### T5 — RegisterDeviceSheet

- **Does:**
  1. Implements `RegisterDeviceSheetComponent` as a standalone component, used as a
     `UiBottomSheetComponent` content via `present()` (same pattern as fe-settings
     BottomSheet usage).
  2. Ports the claim flow from `apps/frontend/src/app/devices/add/page.tsx` (224 lines):
     - Step 1: form with "Device ID" (`IonInput`) and optional "Device Name" fields.
       Submit calls `POST /devices/claim` (`claimDevice`).
     - Step 2: on success, shows the claiming token and expiry with a copy-to-clipboard
       button, plus the instructions string from the response. A "Done" button closes
       the sheet. 
     - Error: inline error message (wrong device ID, already claimed, etc.).
  3. On successful claim + close: emits an output event so the parent page can reload
     the device list (`dashboardService.devices.load({})`).
  4. Sheet is invoked from T2 (Dashboard) and T3 (DevicesList) via the same
     `present()` pattern.

- **Output:**
  - `components/register-device-sheet/register-device-sheet.component.ts/html/scss/spec.ts`
  - `/fe-check` passes.
