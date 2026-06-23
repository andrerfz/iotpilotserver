# fe-device-detail — Open Questions

## Q1 _resolved_ — Untyped OpenAPI responses for device list endpoints

**Question:** Four endpoints used by this module have 200 responses with only a
`description:` line and no `content:` schema, causing the generated Angular client to
type the response as `void`. This blocks typed signals in `DeviceDetailService`.

- `GET /devices/{id}/alerts` — returns `Alert[]` but has no schema
- `GET /devices/{id}/commands` — returns `DeviceCommand[]` but has no schema
- `GET /devices/{id}/logs` — returns log entries but has no schema
- `GET /monitoring/thresholds` — returns `Threshold[]` but has no schema

**Decision:** Same fix as fe-dashboard Q1/Q2. Applied as part of T1:
1. Add `content: application/json: schema: allOf: [$ref: SuccessResponse, $ref: Alert[]]`
   to `GET /devices/{id}/alerts` 200 response.
2. Same for `GET /devices/{id}/commands` → `DeviceCommand[]`.
3. Add a new `DeviceLogEntry` component schema (`id`, `level`, `message`, `source`,
   `timestamp`, `deviceId`); add it to `GET /devices/{id}/logs` 200 response.
4. Add a new `Threshold` component schema (fields from the `POST /monitoring/thresholds`
   request body + `id`); add it to `GET /monitoring/thresholds` 200 response.
5. Run `make ng-api-generate`. Type-check must pass after regeneration.

**Resolved:** 2026-06-13
**Applies to:** T1 (service implementation gate)

---

## Q2 _resolved_ — Device detail sub-navigation: IonTabs vs custom tab bar

**Question:** The device detail section needs inline tab navigation (Overview, Alerts,
Commands, Logs, Network, Storage). Should it use Ionic's `IonTabs` component or a
custom Angular Router + `RouterLink` tab bar?

**Options considered:**
- **Option A — `IonTabs`:** Ionic's built-in tabbed navigation with `IonTabBar` +
  `IonTabButton`. Designed for bottom navigation; can be placed at the top but adds
  Ionic stacking context overhead and a separate `<ion-router-outlet>` inside.
- **Option B (preferred) — Custom tab bar + `RouterLinkActive`:** A
  `DeviceTabNavComponent` styled after the prototype's `.tabs`/`.tab` CSS pattern.
  Each tab is a `RouterLink`; `routerLinkActive="tab--active"` handles active state.
  The device detail page has a single `<router-outlet>` for all child routes.

**Decision:** Option B. Rationale:
1. fe-ui-kit Q1 resolved that the navigation pattern is a side rail (no `IonTabs`
   for bottom nav). Device detail tabs are inline section navigation, not global app
   navigation — they don't map to `IonTabs`' intended use.
2. The prototype uses `.tabs`/`.tab` CSS — a simple custom component matches it exactly.
3. Option B keeps the stacking context flat (no nested Ionic outlets), avoiding the
   same `contain: layout size style` issues encountered in the shell.
4. fe-device-advanced appends new tabs to `DeviceTabNavComponent` as a simple array
   extension — clean without touching Ionic's tab configuration.

**Resolved:** 2026-06-13
**Applies to:** T2 (layout design)

---

## Q3 _resolved_ — Polling strategy: keep or replace with socket events?

**Question:** The legacy commands page polls every 5s and the logs page polls every
10s via `setInterval`. The app has a `SocketService` (fe-core T7). Should polling be
replaced with socket subscriptions?

**Options considered:**
- **Option A (preferred) — Keep polling, matching legacy:** `interval()` +
  `takeUntilDestroyed()` in the component. Deterministic, easy to test, no backend
  contract changes needed.
- **Option B — Replace with socket events:** Would require the backend to emit
  `command:status` and `device:log` socket events. No such events are defined in
  the current socket contract (fe-core T7).

**Decision:** Option A. Keep polling as-is from the legacy. Rationale:
1. No backend socket events exist for command status updates or log streaming.
2. fe-dashboard Q6 resolved that socket subscriptions are page-level, not service-level
   — consistent with keeping polling in the page for now.
3. Polling replacement is a backend-driven optimization, not a migration concern.
4. The only socket subscription added in this module is `deviceUpdates$` on the
   overview page for live device status changes (an existing socket event).

**Resolved:** 2026-06-13
**Applies to:** T2 (overview socket), T3 (commands polling), T4 (logs polling)

---

## Q4 _resolved_ — Thresholds config: fe-device-detail or fe-device-advanced?

**Question:** The legacy `DeviceAlertsPage.tsx` embeds threshold configuration as an
inline modal. The README lists `fe-device-advanced` scope as "device settings". Does
threshold configuration belong here or in fe-device-advanced?

**Options considered:**
- **Option A (preferred) — Keep in fe-device-detail (alerts tab):** Thresholds are
  monitoring configuration; they are accessed from the alerts context in the legacy.
  The `/monitoring/thresholds` endpoint is separate from `/devices/{id}/settings`
  (which handles SSH, reporting intervals, update channel).
- **Option B — Move to fe-device-advanced:** fe-device-advanced owns "device settings"
  per the README scope column.

**Decision:** Option A. Rationale:
1. `DeviceSettings` (`/devices/{id}/settings`) is about device behavior (SSH, reporting,
   update channel). Alert thresholds (`/monitoring/thresholds`) are monitoring rules.
   These are logically separate despite both being "settings".
2. The legacy UX places thresholds in the alerts tab — the user context is "I see
   alerts, I want to tune the thresholds that generate them". Breaking this link
   increases navigation friction.
3. fe-device-advanced owns `/devices/{id}/settings` — SSH credentials, agent config,
   update channel. Not monitoring thresholds.

**Resolved:** 2026-06-13
**Applies to:** T6 (threshold config sheet is in fe-device-detail, not fe-device-advanced)

---

## Q5 _resolved_ — alertsTrend reuse from DashboardService vs DeviceDetailService

**Question:** T5 (alerts page) needs a 7-day trend chart filtered by `deviceId`. The
`DashboardService.alertsTrend` query in fe-dashboard serves the fleet-wide trend (no
`deviceId` filter). Can the same query surface be reused with a `deviceId` param, or
must `DeviceDetailService` add its own `alertsTrend` query?

**Impact:** Non-blocking — both options work and T5 can proceed with either. But the
choice determines whether `DeviceAlertsPage` injects `DashboardService` (cross-feature
injection) or only `DeviceDetailService`.

**Options considered:**
- **Option A:** Add `alertsTrend(params: Signal<{deviceId: string; period: string}>)` to
  `DeviceDetailService`. Clean, no cross-feature dependency.
- **Option B:** Reuse `DashboardService.alertsTrend` which already accepts a `deviceId`
  param — check if it does. If yes, inject `DashboardService` in the alerts page.

**Decision:** Option B. The generated `GetAlertsTrend$Params` interface accepts both
`deviceId?: string` and `period?: '7d' | '30d'`
(`apps/frontend-ng/src/app/core/api/generated/fn/monitoring/get-alerts-trend.ts`), so
the existing surface serves a device-scoped trend without duplication. `DeviceAlertsPage`
injects `DashboardService` and calls
`alertsTrend.load({ deviceId: this.deviceId(), period: '7d' })`
(`apps/frontend-ng/src/app/features/dashboard/pages/device-alerts/device-alerts.page.ts`).
No `DeviceDetailService.alertsTrend` was added.

**Resolved:** 2026-06-23
**Applies to:** T5 (alerts page trend chart)
