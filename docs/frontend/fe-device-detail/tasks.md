# fe-device-detail — Tasks

Each task is one small PR ≤ 1 dev-day. T1 (service) must land before all others.
T2–T7 are independent of each other once T1 merges.

## Status

| # | Task | Status |
|---|---|---|
| T1 | DeviceDetailService — queries + commands signals service (+ fix untyped OpenAPI responses) | done |
| T2 | Device detail layout + overview page (device header, tab nav, metric cards, device info, PENDING_SETUP banner) | done |
| T3 | Commands page + CommandSheet (command list, polling, issue command BottomSheet) | done |
| T4 | Logs page (level/search/source filters, pagination, auto-refresh) | done |
| T5 | Alerts page (list + ack/resolve/delete + trend chart + stats) | done |
| T6 | Threshold config sheet (per-device + global threshold management BottomSheet) | done |
| T7 | Network + Storage pages (device info display, auto-refresh) | done |

---

### T1 — DeviceDetailService

- **Does:**
  1. Fixes four untyped OpenAPI 200 responses — same pattern as fe-dashboard Q1/Q2:
     - `GET /devices/{id}/alerts` → add `content: application/json: schema: allOf SuccessResponse + Alert[]`
     - `GET /devices/{id}/commands` → add `content: application/json: schema: allOf SuccessResponse + DeviceCommand[]`
     - `GET /devices/{id}/logs` → add `content: application/json: schema:` with a new `DeviceLogEntry` component schema (fields: `id`, `level`, `message`, `source`, `timestamp`, `deviceId`)
     - `GET /monitoring/thresholds` → add `content: application/json: schema: allOf SuccessResponse + Threshold[]` (add `Threshold` to component schemas: `id`, `name`, `metricName`, `operator`, `value`, `unit`, `severity`, `type`, `deviceId` nullable, `cooldownMinutes`)
     - Run `make ng-api-generate` to regenerate the client.
  2. Creates `DeviceDetailService` at
     `features/dashboard/services/device-detail.service.ts`.
     `@Injectable({ providedIn: 'root' })`. Injects the generated `Api` client.
  3. **Query surfaces** (each a `runQuery()` signal → `.data`, `.loading`, `.error`, `.load(params)` / `.reload()`):
     - `device(id: Signal<string>)` — wraps `getDevice` (`GET /devices/{id}`). Returns `Device`.
     - `deviceAlerts(params: Signal<{id: string; severity?: string; resolved?: boolean}>)` — wraps `listDeviceAlerts`. Returns `Alert[]`.
     - `deviceCommands(params: Signal<{id: string; limit?: number}>)` — wraps `listDeviceCommands`. Returns `DeviceCommand[]`.
     - `deviceLogs(params: Signal<{id: string; level?: string; source?: string; search?: string; limit?: number; offset?: number}>)` — wraps `getDeviceLogs`. Returns `DeviceLogEntry[]`.
     - `thresholds(params: Signal<{deviceId?: string}>)` — wraps `listThresholds`. Returns `Threshold[]`.
  4. **Command methods** (async, return typed result or throw):
     - `sendCommand(deviceId: string, command: string, arguments?: string): Promise<DeviceCommand>`
     - `updateAlert(deviceId: string, alertId: string, action: 'acknowledge' | 'resolve', note?: string): Promise<void>`
     - `createThreshold(payload: CreateThresholdPayload): Promise<void>`
     - `updateThreshold(id: string, payload: UpdateThresholdPayload): Promise<void>`
     - `regenerateToken(deviceId: string, hostname: string): Promise<ClaimResult>`
     - `updateDevice(id: string, payload: UpdateDevicePayload): Promise<void>`
  5. No socket subscriptions in the service — pages handle that directly.

- **Output:**
  - `docs/openapi.yml` updated (4 content schemas + `DeviceLogEntry` + `Threshold` models)
  - `make ng-api-generate` regenerates affected client files
  - `services/device-detail.service.ts`
  - `services/device-detail.service.spec.ts` — verifies each query invokes the generated
    client with correct params; `deviceCommands.data` populates from mock response;
    `sendCommand` dispatches with correct payload; error surfaces on API failure.
  - `/fe-check` passes.

- **Invariant:** No direct API calls in pages — all go through this service.

---

### T2 — Device detail layout + overview page

- **Does:**
  1. Creates `device-detail.routes.ts` with 6 child routes (one per tab):
     `''` → `DeviceOverviewPage`, `'alerts'` → `DeviceAlertsPage`, `'commands'` →
     `DeviceCommandsPage`, `'logs'` → `DeviceLogsPage`, `'network'` →
     `DeviceNetworkPage`, `'storage'` → `DeviceStoragePage`. All use `loadComponent`.
     fe-device-advanced will add `'metrics'`, `'terminal'`, `'settings'` here.
  2. Adds `devices/:id` route to `shell.routes.ts` (sibling of `devices`), pointing to
     `DeviceDetailPage` with `loadChildren: DEVICE_DETAIL_ROUTES`. `canActivate: [authGuard]`.
  3. **`DeviceDetailPage`** — layout shell component:
     - Fetches device via `deviceDetailService.device(id)` on init.
     - Renders the prototype `.devhead` section: icon, hostname + `StatusBadge`, meta row
       (device ID, IP, location, firmware version, uptime), action buttons (SSH → links
       to `/app/devices/:id/terminal` — placeholder until fe-device-advanced; Refresh;
       Run command → opens `CommandSheet` T3).
     - Renders `DeviceTabNavComponent` below the header.
     - Renders `<router-outlet>` for the active child tab.
     - Breadcrumb: `['Operate', 'Devices', hostname]` — set dynamically after device loads.
     - PENDING_SETUP banner: if `device.rawStatus === 'PENDING_SETUP'`, shows token
       display + expiry + "Regenerate token" button (calls `deviceDetailService.regenerateToken`).
  4. **`DeviceTabNavComponent`** — inline tab bar (prototype `.tabs` + `.tab` pattern):
     - Tabs: Overview, Alerts (with open alert count badge), Commands, Logs, Network, Storage.
     - Uses `RouterLink` + `routerLinkActive='tab--active'` for active state.
     - fe-device-advanced will receive the component and add Metrics/Terminal/Settings tabs.
  5. **`DeviceOverviewPage`** — overview child route:
     - **Metric row** (4 `MetricCard`s): CPU usage, Memory, Temperature, Disk — from
       `device.data()` fields (`cpuUsage`, `memoryUsage`, `cpuTemp`, `diskUsage`).
     - **CPU & memory chart** placeholder card (ECharts placeholder — wired in
       fe-device-advanced when `DeviceMetricsPage` provides the data).
     - **Recent commands card**: `DataTable` of last 5 commands from
       `deviceDetailService.deviceCommands(…)`. "New" button opens `CommandSheet`.
     - **Device info card**: KV grid — Public ID, Hardware, Type, IP address, Tailscale
       IP, Firmware, Location, Uptime, Last seen, Agent version, App status.
     - Loading: skeleton cards while `device.loading()`. Error: `EmptyState` + retry.
     - Real-time device status: subscribes to `SocketService.deviceUpdates$` on init;
       on `device:update` for this device ID, triggers `device.reload()`.

- **Output:**
  - `device-detail.routes.ts`
  - `shell.routes.ts` updated (devices/:id entry added)
  - `pages/device-detail/device-detail.page.ts/html/scss/spec.ts`
  - `pages/device-overview/device-overview.page.ts/html/scss/spec.ts`
  - `components/device-tab-nav/device-tab-nav.component.ts/html/scss/spec.ts`
  - `/fe-check` passes.
  - Navigating to `/app/devices/:id` shows the device header, 6 tabs, and overview content.

- **Invariant:** `DeviceTabNavComponent` must not hard-code tab labels as disabled
  until fe-device-advanced lands — Metrics/Terminal/Settings links should be omitted
  from the component entirely (fe-device-advanced adds them).

---

### T3 — Commands page + CommandSheet

- **Does:**
  1. **`DeviceCommandsPage`** — commands child route:
     - On init: calls `deviceDetailService.deviceCommands.load({ id, limit: 50 })`.
     - Auto-polls every 5s (matching legacy) via `interval(5000)` + `takeUntilDestroyed()`.
     - **Commands DataTable**: columns — Command (monospace, strong), Issued by, Status
       (`StatusBadge`), When (monospace dim). `pageSize=10`. Row click opens a
       command-detail bottom sheet (inline, reuses `CommandSheet` in view mode).
     - **Quick actions panel** (predefined commands from legacy PREDEFINED_COMMANDS list):
       REBOOT, SHUTDOWN, UPDATE, RESTART — each with confirmation before dispatching.
     - Loading skeleton; error state with retry.
  2. **`CommandSheetComponent`** — standalone `BottomSheet` component:
     - Mode `issue`: form with command type selector (enum: REBOOT, SHUTDOWN, UPDATE,
       RESTART, CUSTOM) + optional arguments textarea. Submit calls
       `deviceDetailService.sendCommand(...)`. On success: emits `commandIssued` output
       and closes the sheet.
     - Mode `detail`: read-only view of a `DeviceCommand` (status, exit code, output,
       error, timestamps). Used by the commands table row click.
     - Opened via `UiBottomSheetComponent.present()` from `DeviceCommandsPage` and
       from `DeviceDetailPage` header ("Run command" button).

- **Output:**
  - `pages/device-commands/device-commands.page.ts/html/scss/spec.ts`
  - `components/command-sheet/command-sheet.component.ts/html/scss/spec.ts`
  - `/fe-check` passes.

---

### T4 — Logs page

- **Does:**
  1. **`DeviceLogsPage`** — logs child route:
     - On init: calls `deviceDetailService.deviceLogs.load({ id })`.
     - **Filter bar**: level select (ALL/DEBUG/INFO/WARN/ERROR/FATAL), search input
       (`UiSearchFieldComponent`), source input. Any change calls `.load(new params)`.
     - **Log table**: level badge, message, source (monospace dim), timestamp (monospace).
       Client-side pagination `pageSize=100` matching legacy default.
     - **Auto-refresh toggle** (default off): when on, polls every 10s via
       `interval(10000)` + `takeUntilDestroyed()` — matching legacy behavior.
     - **"Refresh" button**: manual reload.
     - Empty state if no logs match filters.

- **Output:**
  - `pages/device-logs/device-logs.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.

---

### T5 — Alerts page (list + ack/resolve)

- **Does:**
  1. **`DeviceAlertsPage`** — alerts child route:
     - On init: calls `deviceDetailService.deviceAlerts.load({ id })` and
       `dashboardService.alertsTrend.load({ deviceId: id, period: '7d' })` (reuses
       the existing `alertsTrend` query from `DashboardService`).
     - **Alert stats row**: counts of OPEN / ACK / RESOLVED (derived from `deviceAlerts.data`).
     - **Alert trend bar chart** (ECharts): daily counts per severity for last 7 days.
     - **Filter bar**: severity (`MultiSelectPicker`), state (MultiSelect), source.
       Client-side filtering of `deviceAlerts.data`.
     - **Alerts DataTable** (selectable rows):
       - Columns: Severity (bar + `SeverityBadge`), title + message, type, State
         (`StatusBadge`), Triggered (age, monospace dim).
       - Single row actions: Acknowledge / Resolve (calls `deviceDetailService.updateAlert`).
       - Bulk actions bar: "Acknowledge all selected", "Resolve all selected".
     - Real-time: subscribes to `SocketService.alerts$`; `alert:new` for this device
       prepends to local signal array.
     - **"Thresholds" button** (top right): opens `ThresholdConfigSheet` (T6).

- **Output:**
  - `pages/device-alerts/device-alerts.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.

---

### T6 — Threshold config sheet

- **Does:**
  1. **`ThresholdConfigSheetComponent`** — standalone `BottomSheet` component:
     - On open: calls `deviceDetailService.thresholds.load({ deviceId: id })` to load
       per-device thresholds plus global thresholds (no deviceId param).
     - **Scope selector** — `IonSegment`: "This device" vs "Global" (applies to all
       devices). Mirrors the legacy `ThresholdForm.scope` field.
     - **Metric thresholds form** (device-type-aware):
       - System device (`RASPBERRY_PI`, etc.): CPU %, Memory %, Temperature °C, Disk %.
       - Sensor device (`ESP32`, `HELTEC_*`, `SENSOR`): Sensor Temp °C, Battery %.
       - Each slider with live value display.
     - **Save**: if existing threshold for the metric → `deviceDetailService.updateThreshold`;
       if none → `deviceDetailService.createThreshold`. Emits `thresholdsSaved` on success.

- **Output:**
  - `components/threshold-config-sheet/threshold-config-sheet.component.ts/html/scss/spec.ts`
  - `/fe-check` passes.

---

### T7 — Network + Storage pages

- **Does:**
  1. **`DeviceNetworkPage`** — network child route (193 legacy lines):
     - On init: calls `deviceDetailService.device.load({ id })`.
     - **Auto-refresh toggle** (default off): polls every 30s when on.
     - **Network KV grid** (read-only): IP address, Tailscale IP, Hostname, MAC address,
       WiFi quality chip (from `device.networkInterface` or direct device fields). Legacy
       displays `ipAddress`, `tailscaleIp`, `hostname`, `architecture`, and a WiFi quality
       badge if available.
     - "Refresh" button.
  2. **`DeviceStoragePage`** — storage child route (202 legacy lines):
     - Same device load + auto-refresh pattern.
     - **Usage bars** for disk partitions (from `device.diskUsage`, `device.diskTotal`).
     - **KV grid**: filesystem type, mount point, total/used/free.
     - "Refresh" button.

- **Output:**
  - `pages/device-network/device-network.page.ts/html/scss/spec.ts`
  - `pages/device-storage/device-storage.page.ts/html/scss/spec.ts`
  - `/fe-check` passes.
