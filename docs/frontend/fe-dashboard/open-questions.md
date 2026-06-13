# fe-dashboard — Open Questions

## Q1 _resolved_ — listDevices 200 response has no typed schema in openapi.yml

**Question:** `GET /devices` returns `description: Device list with pagination` but no
`content: application/json: schema:` entry. The generated Angular client therefore types
the 200 response as `void`, breaking T1's typed signal and every page that reads
`devices.data`.

**Impact:** Gates T1 — `DashboardService.devices` cannot be typed until fixed.

**Options considered:**
- **Option A (preferred):** Add inline schema to the 200 response referencing a new
  `DevicePaginatedResponse` component schema (`{ devices: Device[], total, page, limit }`).
  Run `make ng-api-generate`. This follows the pattern already applied for security/system
  settings in fe-settings.
- **Option B:** Add a direct `$ref` to `SuccessResponse` with a `data.devices` envelope —
  matches the actual backend response shape from `apps/backend/src/routes/device.router.ts`.

Same fix applies to `POST /devices/claim` (200 response: `{ deviceId, claimingToken,
expiresAt, instructions }`).

**Resolved:** 2026-06-12 — Option A applied. Added `content:` schemas to `GET /devices` (allOf SuccessResponse + Device[]) and `POST /devices/claim` (ClaimResult model). `make ng-api-generate` regenerated `list-devices.ts`, `claim-device.ts`, and `models/claim-result.ts`.

---

## Q2 _resolved_ — listAlerts and getAlertsTrend 200 responses untyped

**Question:** Same pattern as Q1. `GET /monitoring/alerts` and `GET /monitoring/alerts/trend`
have `description:` only — no `content:` schema. Also `GET /monitoring/metrics` has no
schema on its 200 response.

**Impact:** Gates T4 (and the alerts feed in T2). Without typed responses, all three
endpoints return `void` from the generated client.

**Options considered:**
- **Option A (preferred):** Add `Alert` array schema to `listAlerts`, `AlertTrendPoint[]`
  to `getAlertsTrend`, and a `MonitoringMetrics` model to `getMonitoringMetrics`.
  Run `make ng-api-generate`.

**Resolved:** 2026-06-12 — Option A applied. Added allOf SuccessResponse + Alert[] to `listAlerts`, and MonitoringMetrics model to `getMonitoringMetrics`. `getAlertsTrend` already had a typed schema. Regenerated client.

---

## Q3 _resolved_ — ngx-echarts not installed in apps/frontend-ng

**Question:** The fleet CPU chart (T2) and alert trend bar chart (T4) require ECharts.
`ngx-echarts` + `echarts` are not in `apps/frontend-ng/package.json`. The sparkline
component's comment acknowledges this as a fe-dashboard prerequisite.

**Impact:** Gates T2 (fleet CPU chart) and T4 (alert trend chart). T3 and T5 can proceed
without it.

**Options considered:**
- **Option A (preferred):** `pnpm --filter frontend-ng add echarts ngx-echarts`.
  Add `provideEcharts()` to the app providers. Register the `NgxEchartsModule` (or use
  the standalone directive — verify the current ngx-echarts standalone API). The
  `SparklineComponent` in `shared/ui` already cites this package as the intended chart
  library for fe-dashboard.

**Resolved:** 2026-06-12 — `echarts@^6.1.0` + `ngx-echarts@^22.0.0` added to `apps/frontend-ng/package.json`. `provideEchartsCore({ echarts: () => import('echarts') })` registered in `main.ts`. Type-check and all 294 tests pass.

---

## Q4 _resolved_ — MonitoringView: separate module or part of fe-dashboard?

**Question:** The prototype has a dedicated "Monitoring" view (MonitoringView in
views.jsx) under the "Operate" nav group alongside Dashboard and Devices. The legacy app
has no corresponding page. The README lists fe-dashboard scope as "Home, device list,
MetricsDashboard (ECharts)". Does monitoring/alerts belong here?

**Decision:** Yes — MonitoringView belongs in fe-dashboard. Rationale:
1. The README scope "MetricsDashboard (ECharts)" refers to the ECharts-powered fleet
   metrics charts in both DashboardView and MonitoringView — not the per-device
   MetricsDashboard component (which stays in fe-device-detail).
2. There is no `fe-monitoring` module in the README table. Monitoring alerts are
   foundational to the fleet view and required before fe-device-detail (which links to
   alert detail from device pages).
3. The 4–6 day estimate is consistent with 3 pages + 1 service + 1 sheet.

**Resolved:** 2026-06-12
**Applies to:** T1, T4, acceptance.md parity checklist

---

## Q5 _resolved_ — Add device: full page or BottomSheet?

**Question:** Legacy `app/devices/add/page.tsx` is a full routed page (224 lines, `/devices/add`).
The prototype uses a `RegisterDeviceSheet` BottomSheet triggered from both DashboardView
and DevicesListView. Which pattern for Angular?

**Decision:** BottomSheet (T5). Rationale:
1. The prototype is the visual/UX contract (fe-ui-kit Q7) — it uses a sheet.
2. The claim flow is 2 steps (form + token display), compact enough for a sheet.
3. Avoids a full navigation break for a simple registration flow, matching mobile-native feel.
4. Legacy route `/devices/add` is not needed — the new path is sheet-triggered from `/app/devices`
   and `/app/dashboard`.

**Resolved:** 2026-06-12
**Applies to:** T2, T3, T5

---

## Q6 _resolved_ — Real-time: socket consumer in service vs page

**Question:** Should `DashboardService` expose a `deviceUpdates$` observable wrapping
`SocketService`, or should pages subscribe to `SocketService` directly?

**Decision:** Pages subscribe to `SocketService` directly. Rationale:
1. Socket subscriptions are tied to the page lifecycle (subscribe on init, unsubscribe on
   destroy). A service-level subscription would need to manage that lifecycle artificially.
2. `SocketService` is already the single abstraction for socket events (fe-core T7).
   Adding another layer adds indirection without encapsulating anything.
3. The only page-level action is "prepend to local signal array" or "patch one row" — 1–2
   lines. Not enough logic to justify a service wrapper.

**Resolved:** 2026-06-12
**Applies to:** T2, T3 (real-time device status)
