# fe-device-advanced — Tasks

Each task is one small PR ≤ 1 dev-day.

T1 (service extension + schema fixes) must land before T3, T4, T5.
T2 (tab nav + routes) can land in parallel with T1 — it creates minimal stub pages so
the three new tabs are navigable immediately.
T3 and T4 are independent of each other; both require T1 + T2.
T5 requires T1 + T2. T6 requires T5 (extends the same page file).

## Status

| # | Task | Status |
|---|---|---|
| T1 | `DeviceDetailService` extension + fix untyped `getDeviceMetrics` + `executeDeviceSsh` OpenAPI responses | ✅ done |
| T2 | Extend `DeviceTabNavComponent` + add metrics/terminal/settings child routes (stub pages) | ✅ done |
| T3 | `DeviceMetricsPage` (period selector, current-value cards, 4 ECharts line charts) | ✅ done |
| T4 | `DeviceTerminalPage` + `SshTerminalComponent` (offline guard, REST command execution, output display) | ✅ done |
| T5 | `DeviceSettingsPage` — General + Monitoring sections (device info form, tags, intervals, device-type-aware thresholds) | ✅ done |
| T6 | `DeviceSettingsPage` — Network, Agent, Security sections + Rotate Key reveal | ✅ done |

---

### T1 — DeviceDetailService extension + OpenAPI schema fixes

- **Does:**
  1. Fixes two untyped 200 responses in `docs/openapi.yml`:
     - `GET /devices/{id}/metrics` — add `content: application/json: schema: allOf SuccessResponse + DeviceMetrics`. Add new component schemas:
       - `MetricPoint`: `{ timestamp: string (date-time), value: number, unit: string }`
       - `DeviceMetrics`: `{ metrics: object (additionalProperties: MetricPoint[]), period: string, resolution: string, total_points: integer, processed_points: integer }`
     - `POST /devices/{id}/ssh` — add `content: application/json: schema: allOf SuccessResponse + SshResult`. Add new component schema:
       - `SshResult`: `{ output: string, error: string (nullable: true) }`
     - Run `make ng-api-generate`.
  2. Extends `DeviceDetailService` with:
     - **`deviceMetrics(params: Signal<{ id: string; period?: string }>)`** — `runQuery()` wrapping `getDeviceMetrics`. Returns `DeviceMetrics`.
     - **`deviceSettings(params: Signal<{ id: string }>)`** — `runQuery()` wrapping `getDeviceSettings`. Returns `DeviceSettings`.
     - **`executeSSH(deviceId: string, command: string, timeout?: number): Promise<SshResult>`** — calls `executeDeviceSsh`. Throws on non-2xx. Command method, not a query — no `runQuery()`.
     - **`updateSettings(id: string, payload: DeviceSettings): Promise<void>`** — calls `updateDeviceSettings`. Throws on error. (Verify not already present from fe-device-detail T1; add if missing.)
     - `rotateKey` already exists from fe-device-detail T1 — verify and skip if present.

- **Output:**
  - `docs/openapi.yml` updated (2 content schemas + 3 new models: `MetricPoint`, `DeviceMetrics`, `SshResult`)
  - Regenerated client files (at minimum `get-device-metrics.ts`, `execute-device-ssh.ts`, new model files)
  - `device-detail.service.ts` extended
  - `device-detail.service.spec.ts` updated with tests: `deviceMetrics.data()` populates from mock `getDeviceMetrics` response; `executeSSH` dispatches with correct payload + returns typed `SshResult`; `deviceSettings.data()` populates from mock `getDeviceSettings`
  - `/fe-check` passes

- **Invariant:** `executeSSH` is a mutating command (`POST`). It must NOT use `runQuery()`. Return `Promise<SshResult>`, let the caller handle the `output` signal.

---

### T2 — Extend DeviceTabNavComponent + child routes

- **Does:**
  1. Adds a `deviceType` input signal to `DeviceTabNavComponent`:
     `readonly deviceType = input<string>('');`
     Used to conditionally hide the Terminal tab for sensor devices (same logic as `isSensorDevice()` in the legacy).
  2. Adds three tabs to the component's template after the existing tabs:
     - Metrics → `routerLink="metrics"`, icon `pulse-outline`
     - Terminal → `routerLink="terminal"`, icon `terminal-outline`; hidden via `@if (!isSensor())` where `isSensor = computed(() => isSensorDevice(deviceType()))`. Import `isSensorDevice` from `@iotpilot/core/device/domain/value-objects/device-type.vo`.
     - Settings → `routerLink="settings"`, icon `settings-outline`
  3. `DeviceDetailPage` passes `deviceType` to the component:
     `<app-device-tab-nav [deviceType]="device.data()?.deviceType ?? ''" />`
  4. Adds three child routes to `device-detail.routes.ts` using `loadComponent`:
     - `{ path: 'metrics', loadComponent: () => import('../pages/device-metrics/device-metrics.page').then(m => m.DeviceMetricsPage) }`
     - `{ path: 'terminal', loadComponent: () => import('../pages/device-terminal/device-terminal.page').then(m => m.DeviceTerminalPage) }`
     - `{ path: 'settings', loadComponent: () => import('../pages/device-settings/device-settings.page').then(m => m.DeviceSettingsPage) }`
  5. Creates three **minimal stub pages** (one `ion-content` + `<p>Coming soon</p>`) so the routes resolve immediately. T3/T4/T5 replace the stub content.

- **Output:**
  - `device-tab-nav.component.ts/html/scss` updated
  - `device-detail.routes.ts` updated
  - `device-detail.page.ts/html` updated (new `deviceType` binding)
  - 3 stub page files created under `pages/device-metrics/`, `pages/device-terminal/`, `pages/device-settings/`
  - `/fe-check` passes
  - Navigating to `/app/devices/:id/metrics` (or terminal/settings) renders the stub content

- **Invariant:** Sensor device detection re-uses the shared `isSensorDevice()` VO function from `packages/core`. No new logic invented here.

---

### T3 — DeviceMetricsPage

- **Does:**
  1. **`DeviceMetricsPage`** — `metrics` child route (replaces stub from T2):
     - Route param: `id` from parent route via `ActivatedRoute` or `input()`.
     - On init: calls `deviceDetailService.deviceMetrics.load({ id, period: '24h' })`.
     - **Period selector**: `ui-date-range-picker` (shared component) with presets 1h, 6h, 24h, 7d, plus a real custom range (click a start day, click an end day, optional per-side time-of-day). Presets call `.load({ id, period })`; a custom range calls `.load({ id, startTime, endTime })` (backend `GET /devices/:id/metrics` accepts `startTime`/`endTime` as an alternative to `period`, added post-launch). Chart axis labels switch from time-of-day to date once the resolved range spans ≥ 36h, regardless of preset vs. custom.
     - **Current-value row** (4 `MetricCard`s using `ui-metric-card`): CPU, Memory, Disk, Temperature. Value = last element of respective series from `deviceMetrics.data()?.metrics`. Color coding (matching legacy thresholds):
       - CPU: danger > 80%, warning > 60%, default otherwise
       - Memory: danger > 85%, warning > 70%
       - Disk: danger > 90%, warning > 75%
       - Temperature: danger > 75°C, warning > 60°C
     - **4 ECharts line charts** (ngx-echarts `echarts` directive): CPU %, Memory %, Disk %, Temperature °C. Each chart: line series with `smooth: true`, `symbol: none`; x-axis formatted timestamps (time strings for 1h/6h/24h; date for 7d); y-axis with unit label; tooltip; "No data available" empty state card when series is absent or empty.
     - **Refresh button**: calls `deviceDetailService.deviceMetrics.reload()`.
     - **Loading state**: skeleton `MetricCard`s + placeholder chart cards.
     - **Error state**: `EmptyState` with retry.

- **Output:**
  - `pages/device-metrics/device-metrics.page.ts/html/scss/spec.ts`
  - `/fe-check` passes
  - Navigating to `/app/devices/:id/metrics` shows period selector, 4 metric cards, 4 charts

- **Invariant:** Use `ngx-echarts` `echarts` directive (standalone), not `NgxEchartsModule`. ECharts options passed as a `computed()` signal derived from `deviceMetrics.data()`.

---

### T4 — DeviceTerminalPage + SshTerminalComponent

- **Does:**
  1. **`DeviceTerminalPage`** — `terminal` child route (replaces stub from T2):
     - Reads device from `deviceDetailService.device` (already loaded and cached by `DeviceDetailPage`).
     - **Offline guard**: if `device.data()?.rawStatus !== 'ONLINE'`, renders `EmptyState` — "Device Offline", device status chip, no terminal rendered.
     - **Connect flow**: initial state shows a card with "Connect Terminal" button. On click: `showTerminal` signal → `true`, renders `SshTerminalComponent`.
     - **Page layout**: `ion-content` without padding; terminal fills available height. No nested scroll.
  2. **`SshTerminalComponent`** — standalone component:
     - `deviceId = input.required<string>()`
     - Internal signals: `output = signal<string[]>([])`, `executing = signal(false)`, `connected = signal(false)`
     - Form: text `input` (mono font) + Send button. Disabled while `executing()`.
     - On submit: appends `$ {command}` to output, calls `deviceDetailService.executeSSH(deviceId(), command)`, appends `result.output` (or `Error: result.error`) to output, clears input. Sets `connected(true)` on first success.
     - Clear button: sets `output([])`.
     - Output area: `<div role="log" aria-live="polite">` with `<pre>` lines; dark background, monospace; auto-scrolls to bottom after each append via `afterNextRender()` + `ViewChild` reference.
     - Keyboard shortcut: `Enter` submits the form.

- **Output:**
  - `pages/device-terminal/device-terminal.page.ts/html/scss/spec.ts`
  - `components/ssh-terminal/ssh-terminal.component.ts/html/scss/spec.ts`
  - `/fe-check` passes

- **Invariant:** No xterm.js. This is `POST /devices/{id}/ssh` command-by-command execution — not a PTY. The component is named `SshTerminalComponent` for parity with the legacy filename, but the UX is command-in / output-out. Q1 resolved.

---

### T5 — DeviceSettingsPage: General + Monitoring sections

- **Does:**
  1. **`DeviceSettingsPage`** — `settings` child route (replaces stub from T2):
     - On init: calls `deviceDetailService.deviceSettings.load({ id })` and reads device from `deviceDetailService.device`.
     - **Reactive form** (`FormGroup`) with all `DeviceSettings` fields. `patchValue()` when `deviceSettings.data()` resolves.
     - **Unsaved changes banner**: `@if (form.dirty)` — sticky card at top of `ion-content` with Reset + Save buttons. Reset calls `form.reset(originalSettings)`. Save calls `deviceDetailService.updateSettings(id, form.value)` then re-patches with server response.
     - **`IonSegment`** with sections: General, Monitoring, Network+Agent, Security. `activeSection` signal tracks selected segment.
     - **General section** `@if (activeSection() === 'general')`:
       - Device name `ui-input`, Device type `ui-select` (options from `DEVICE_TYPES`), Location `ui-input`, Description `IonTextarea`.
       - Tags: chip list (`@for` of `form.value.tags`) each with remove button; Add-tag `ui-input` + "Add" button.
       - Read-only device details KV grid (device type label, architecture, model, registered date, last seen, agent version) — from `deviceDetailService.device.data()`, not the form.
     - **Monitoring section** `@if (activeSection() === 'monitoring')`:
       - Metrics enabled `IonToggle`.
       - `@if (isSensor())` — Sensor reporting interval quick-pick buttons (5 min, 15 min, 30 min, 1h, 2h, 6h, 12h). Current value display.
       - `@else` — Heartbeat interval `IonRange` (min 30, max 600, step 30). Current value display.
       - Alert thresholds card (device-type-aware):
         - Sensor device: High Temperature Alert (°C) `IonRange` (−30 to 50, step 1) + Battery Low Alert (%) `IonRange` (5 to 50, step 5).
         - System device: CPU %, Memory %, CPU Temperature °C, Disk % — each an `IonRange`.
       - `isSensor = computed(() => isSensorDevice(deviceSettings.data()?.deviceType ?? ''))`.
     - Loading: skeleton cards. Error: `EmptyState` + retry.

- **Output:**
  - `pages/device-settings/device-settings.page.ts/html/scss` (partial — security section added in T6)
  - `pages/device-settings/device-settings.page.spec.ts` (partial)
  - `/fe-check` passes

- **Invariant:** The `DEVICE_TYPES` constant is re-used from `packages/core`. Import `DeviceModelEnum` and `DEVICE_REGISTRY` from `@iotpilot/core/device/domain/value-objects/device-type.vo` — same as legacy.

---

### T6 — DeviceSettingsPage: Network, Agent, Security + Rotate Key

- **Does:**
  1. Extends `DeviceSettingsPage` with the remaining two segments:
     - **Network+Agent section** `@if (activeSection() === 'network')`:
       - Network info KV (IP address, Tailscale IP) — read from `deviceDetailService.device.data()`, not the form.
       - Network Monitoring `IonToggle` bound to form.
       - Agent version (read-only), autoUpdate `IonToggle`, updateChannel `ui-select` (stable/beta/nightly).
     - **Security section** `@if (activeSection() === 'security')` (system devices only — `@if (!isSensor())`):
       - SSH Access `IonToggle`.
       - API Key Rotation Days `IonRange` (7–365, step 1; 365 label "disabled").
       - **Rotate API Key button**: calls `deviceDetailService.rotateKey(id, device.hostname)`.
         On success: shows new key in a monospace reveal card (inline, not a modal) with a Copy button (`navigator.clipboard.writeText`). "I've saved the key" dismiss button hides the reveal card. Copying shows "Copied!" for 2s.
       - **Revoke SSH Access button**: confirmation `ion-alert` (programmatic) → on confirm, saves `{ ...currentSettings, sshEnabled: false }` immediately.
  2. Completes `device-settings.page.spec.ts`:
     - Save dispatches `updateSettings` with form value
     - `rotateKey` success shows the key reveal card
     - Revoke access saves `sshEnabled: false` on confirm
     - Form dirty detection triggers unsaved-changes banner

- **Output:**
  - `pages/device-settings/device-settings.page.ts/html/scss` — complete
  - `pages/device-settings/device-settings.page.spec.ts` — complete
  - `/fe-check` passes
  - Full behavioral parity with legacy `DeviceSettingsPage.tsx`

- **Constraint:** Rotate Key is destructive (old key invalidated, device goes offline until reconnect). Always require confirmation before calling `rotateKey`. The existing `rotateKey` method in `DeviceDetailService` already takes `hostname` — use the device hostname for the alert message.
