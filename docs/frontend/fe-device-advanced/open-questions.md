# fe-device-advanced — Open Questions

## Q1 _resolved_ — xterm.js vs REST command execution for SSH terminal

**Question:** The README scope column says "SSH terminal (xterm)". The legacy
implementation (`ssh-terminal.tsx`, 52 lines) does NOT use xterm.js — it uses
`POST /devices/{id}/ssh` to execute one command at a time and displays output in a div.
Should the Angular port implement real xterm.js (interactive PTY) or match the legacy
behavior (REST command execution)?

**Options considered:**
- **Option A — Port as-is (REST command execution, custom output div):** Behavioral
  parity with the legacy. `POST /devices/{id}/ssh` returns `{ output, error }`. Simple
  component, no new dependencies.
- **Option B — Real xterm.js terminal:** Requires a WebSocket SSH proxy on the backend
  (a persistent connection with a PTY, stdin/stdout streams). No such endpoint exists in
  `docs/openapi.yml` or the backend codebase. Would require a `ddd-scaffold-backend` task
  first and significant backend work.

**Decision:** Option A. Rationale:
1. The actual legacy behavior is REST command execution — "xterm" in the README was
   aspirational wording, not a spec.
2. No WebSocket SSH proxy exists in the backend. Building one is a backend-scope task,
   not part of this frontend migration.
3. The `SshTerminalComponent` provides the same UX: command input + output display.
   If a real PTY is added later, the component interface (input `deviceId`, output display
   area) remains the same — only the data source changes.

**Resolved:** 2026-06-14
**Applies to:** T4 (SshTerminalComponent design)

---

## Q2 _resolved_ — Terminal page layout: child route within tab nav vs full-screen

**Question:** The legacy terminal page is a full-page route with its own layout (no device
tab nav visible). `DeviceDetailPage` in fe-device-detail has a tab nav that is always
visible for all child routes. Should `DeviceTerminalPage` be a child route within the
existing tab nav (device header + tabs + terminal below) or a dedicated full-screen route
(no header or tabs, maximum terminal height)?

**Options considered:**
- **Option A (preferred) — Child route within tab nav:** Simpler, consistent with the
  other tabs. `ion-content` fills the space below the tab nav. The terminal component
  uses `height: 100%` within the content area. User sees device hostname/status in the
  header for context.
- **Option B — Full-screen dedicated route:** Would require a separate route entry
  outside `device-detail.routes.ts`, a different back-navigation pattern, and special
  casing in the shell. More complexity for marginal UX gain.

**Decision:** Option A. The terminal content fills `ion-content` completely (no padding,
dark background). The device header context (hostname, status) is actually useful in the
terminal view — confirms which device the terminal is connected to. `ion-content` without
`class="ion-padding"` gives the terminal full height.

**Resolved:** 2026-06-14
**Applies to:** T2 (route placement), T4 (DeviceTerminalPage layout)

---

## Q3 _resolved_ — getDeviceMetrics 200 response schema

**Question:** `GET /devices/{id}/metrics` returns `description: Time-series metrics` with
no `content:` schema. The generated client types the response as `void`. What is the
actual response shape?

**Answer (from `apps/backend/src/routes/devices.router.ts` lines 1682–1767):**
```json
{
  "metrics": {
    "cpu": [{ "timestamp": "ISO-string", "value": 45.2, "unit": "%" }],
    "memory": [...],
    "disk": [...],
    "temperature": [...],
    "battery_level": [...],
    "wifi_rssi": [...]
  },
  "period": "24h",
  "resolution": "auto",
  "total_points": 1440,
  "processed_points": 1440
}
```
The `metrics` object is keyed by metric type. Not all keys are present for every device —
sensor devices have `battery_level`/`wifi_rssi`/`temperature`; system devices have
`cpu`/`memory`/`disk`/`temperature`. The `DeviceMetrics` schema uses
`additionalProperties` to type this correctly.

**Decision:** Add `MetricPoint` + `DeviceMetrics` component schemas; add `content:`
to the 200 response. Run `make ng-api-generate`. — T1.

**Resolved:** 2026-06-14
**Applies to:** T1 (OpenAPI fix), T3 (chart data access)

---

## Q4 _resolved_ — executeDeviceSsh 200 response schema

**Question:** `POST /devices/{id}/ssh` returns `description: SSH command result` with no
`content:` schema. What is the actual response shape?

**Answer (from `apps/backend/src/routes/devices.router.ts` lines 1963–2014):**
```json
{ "success": true, "output": "...", "error": null }
```
The backend executes `ExecuteSshCommandCommand` and returns `{ output: string, error: string | null }`.
Wrapped in the standard `send.ok(res, { success, output, error })` envelope.

**Decision:** Add `SshResult` component schema (`{ output: string, error: string nullable }`);
add `content:` to the 200 response wrapping it in `allOf SuccessResponse + SshResult`. — T1.

**Resolved:** 2026-06-14
**Applies to:** T1 (OpenAPI fix), T4 (SshTerminalComponent output handling)
