# fe-dashboard — Scope

## Purpose

Implements the core operational views of the IoT Pilot console: the fleet overview
dashboard (Home), the dedicated devices list, and the monitoring/alerts page. Together
these three pages cover the "Operate" section of the shell nav rail (Dashboard, Devices,
Monitoring). Once done, `fe-device-detail` can start — it depends on the devices list
route and the device navigation pattern established here.

## Binding upstream decisions

- Prototype is the visual contract; legacy is the behavioral contract →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q7
- `DataTable` is sortable + client-paginated + selectable with bulk-action bar, wrapped in
  `overflow-x: auto` — no card-per-row transform on mobile →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q2
- Server state via `runQuery()` + CommandBus/QueryBus; no direct API client calls in pages
  → [fe-core/open-questions.md](../fe-core/open-questions.md) Q3
- Socket `device:update` and `alert:new` events (tenant-scoped after T7 backend fix) are
  the real-time source for dashboard status and alert feed →
  [fe-core/open-questions.md](../fe-core/open-questions.md) Q5
- Shell nav rail: "Operate" group → Dashboard, Devices, Monitoring →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q1

## Target structure

```
apps/frontend-ng/src/app/features/dashboard/
├── pages/
│   ├── dashboard/                  # Fleet overview (Home)
│   │   ├── dashboard.page.ts
│   │   ├── dashboard.page.html
│   │   ├── dashboard.page.scss
│   │   └── dashboard.page.spec.ts
│   ├── devices/                    # Dedicated device fleet list
│   │   ├── devices.page.ts
│   │   ├── devices.page.html
│   │   ├── devices.page.scss
│   │   └── devices.page.spec.ts
│   └── monitoring/                 # Alerts + metrics charts
│       ├── monitoring.page.ts
│       ├── monitoring.page.html
│       ├── monitoring.page.scss
│       └── monitoring.page.spec.ts
├── components/
│   └── register-device-sheet/      # BottomSheet for claiming a device
│       ├── register-device-sheet.component.ts
│       ├── register-device-sheet.component.html
│       ├── register-device-sheet.component.scss
│       └── register-device-sheet.component.spec.ts
└── services/
    └── dashboard.service.ts        # Wraps listDevices, listAlerts, getMonitoringMetrics
```

## Legacy inventory replaced

| Legacy (`apps/frontend/src`) | Lines | Replacement |
|---|---|---|
| `app/page.tsx` | 5 | dropped — thin shell, replaced by route |
| `components/dashboard.tsx` | 94 | `pages/dashboard/dashboard.page.ts` |
| `components/device-list.tsx` | 111 | `pages/devices/devices.page.ts` |
| `app/devices/add/page.tsx` | 224 | `components/register-device-sheet/` (BottomSheet) |
| `components/monitoring/MetricsDashboard.tsx` | 184 | **not ported here** — per-device, goes in fe-device-detail |
| `context/domain/monitoring.context.tsx` | 27 | dropped — empty stub, nothing to port |
| `hooks/queries/use-device-queries.ts` | 58 | `services/dashboard.service.ts` (listDevices signal) |
| `hooks/domain/use-device-metrics.ts` | 55 | **not ported here** — per-device, goes in fe-device-detail |

Note: The legacy `dashboard.tsx` renders only a `DeviceList` — the fleet overview design
comes from the prototype's `DashboardView` (KPI cards, device table, live alerts feed,
fleet CPU chart). The prototype is the visual contract; the legacy behavioral contract is
the device list and status rendering.

## Endpoints consumed

| Endpoint | Operation ID | Used by |
|---|---|---|
| `GET /devices` | `listDevices` | Dashboard page, Devices list page |
| `GET /monitoring/alerts` | `listAlerts` | Dashboard (alerts feed), Monitoring page |
| `GET /monitoring/alerts/trend` | `getAlertsTrend` | Monitoring page (ECharts bar chart) |
| `GET /monitoring/metrics` | `getMonitoringMetrics` | Dashboard (fleet CPU chart), Monitoring page |
| `POST /devices/claim` | `claimDevice` | RegisterDeviceSheet |

Open: `listDevices` 200 response has no `content:` schema in `docs/openapi.yml` — see
Q1. Similarly `listAlerts`, `getMonitoringMetrics`, `getAlertsTrend` — see Q2.

## Dependencies

`fe-ui-kit` (done) — `DataTable`, `MetricCard`, `UiBottomSheetComponent`, `StatusBadge`,
`DevicePicker`, `MultiSelectPicker`, `DateRangePicker`, and the full Ionic + Tailwind
token system are all required by every page in this module.

`ngx-echarts` + `echarts` — not yet installed in `apps/frontend-ng`. Required for fleet
CPU time-series chart (Dashboard page) and alert trend chart (Monitoring page). Must be
added before T2/T4 can start — see Q3.

## Out of scope

- Per-device metrics charts (CPU/memory/temperature/disk over time) → `fe-device-detail`
- SSH terminal, device commands → `fe-device-detail` / `fe-device-advanced`
- Admin device list (`/admin/devices`) → `fe-admin`
- Real-time socket wiring (`device:update` → live status on device rows) is included here
  as a read-only consumer of the `SocketService` (fe-core T7). No backend socket changes
  in this module.
