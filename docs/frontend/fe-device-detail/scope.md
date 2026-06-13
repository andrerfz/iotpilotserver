# fe-device-detail — Scope

## Purpose

Deliver the tabbed device detail section of the Angular app: overview, alerts, commands,
logs, network, and storage sub-pages for a single IoT device. When done, clicking any
device row in the fleet list opens a fully functional device detail section at
`/app/devices/:id` with six routed tabs. This module is the prerequisite for
`fe-device-advanced` (metrics charts, SSH terminal, device settings).

## Binding upstream decisions

- Angular standalone + signals, no NgModules/NgRx → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md)
- Generated API client only, no hand-written fetch → [fe-core/open-questions.md](../fe-core/open-questions.md)
- `shared/ui` barrel, no direct `@ionic/angular` imports in feature code → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q3
- Prototype is the visual/UX contract; legacy app is the behavioral parity reference → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q7
- No bottom tabs for device sub-navigation; prototype uses inline `.tabs`/`.tab` pattern → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q1
- Pages subscribe to `SocketService` directly for real-time events → [fe-dashboard/open-questions.md](../fe-dashboard/open-questions.md) Q6
- `RegisterDeviceSheet` is a BottomSheet, not a routed page → [fe-dashboard/open-questions.md](../fe-dashboard/open-questions.md) Q5

## Target structure

```
apps/frontend-ng/src/app/features/dashboard/
├── pages/
│   ├── device-detail/               # T2 — layout shell + overview sub-page
│   │   └── device-detail.page.ts/html/scss/spec.ts
│   ├── device-overview/             # T2 — overview child route
│   │   └── device-overview.page.ts/html/scss/spec.ts
│   ├── device-commands/             # T3
│   │   └── device-commands.page.ts/html/scss/spec.ts
│   ├── device-logs/                 # T4
│   │   └── device-logs.page.ts/html/scss/spec.ts
│   ├── device-alerts/               # T5
│   │   └── device-alerts.page.ts/html/scss/spec.ts
│   ├── device-network/              # T7
│   │   └── device-network.page.ts/html/scss/spec.ts
│   └── device-storage/              # T7
│       └── device-storage.page.ts/html/scss/spec.ts
├── components/
│   ├── device-tab-nav/              # T2 — inline tab bar (prototype .tabs pattern)
│   │   └── device-tab-nav.component.ts/html/scss/spec.ts
│   ├── command-sheet/               # T3 — issue command BottomSheet
│   │   └── command-sheet.component.ts/html/scss/spec.ts
│   └── threshold-config-sheet/      # T6 — threshold management BottomSheet
│       └── threshold-config-sheet.component.ts/html/scss/spec.ts
└── services/
    └── device-detail.service.ts     # T1 (+ spec.ts)

apps/frontend-ng/src/app/features/dashboard/
└── device-detail.routes.ts          # T2 — child routes for the device section
```

The `DeviceDetailPage` is the layout shell (device header + tab nav + `<router-outlet>`);
each tab renders a separate child component. The device section is added to
`shell.routes.ts` as a sibling of `devices`:

```typescript
{
  path: 'devices/:id',
  loadComponent: () => import('.../device-detail.page').then(m => m.DeviceDetailPage),
  canActivate: [authGuard],
  data: { breadcrumb: ['Operate', 'Devices'] },
  loadChildren: () =>
    import('.../device-detail.routes').then(m => m.DEVICE_DETAIL_ROUTES),
}
```

`DEVICE_DETAIL_ROUTES` (in `device-detail.routes.ts`) covers the six tabs for this
module. `fe-device-advanced` will append metrics, terminal, and settings to the same
array.

## Legacy inventory replaced

| Legacy (`apps/frontend/src`) | Lines | Replacement |
|---|---|---|
| `components/device-page.tsx` | 862 | `device-detail.page.ts` (layout + header) + `device-overview.page.ts` (overview tab) |
| `components/device-nav.tsx` | 321 | `device-tab-nav.component.ts` |
| `components/device-layout.tsx` | 69 | merged into `device-detail.page.ts` |
| `app/devices/[id]/page.tsx` | 9 | dropped (redirect wrapper only) |
| `app/devices/[id]/layout.tsx` | 11 | dropped (Next.js layout wrapper only) |
| `app/devices/[id]/alerts/DeviceAlertsPage.tsx` | 611 | `device-alerts.page.ts` (T5, list) + `threshold-config-sheet.component.ts` (T6) |
| `app/devices/[id]/commands/DeviceCommandsPage.tsx` | 613 | `device-commands.page.ts` + `command-sheet.component.ts` (T3) |
| `app/devices/[id]/logs/DeviceLogsPage.tsx` | 356 | `device-logs.page.ts` (T4) |
| `app/devices/[id]/network/DeviceNetworkPage.tsx` | 193 | `device-network.page.ts` (T7) |
| `app/devices/[id]/storage/DeviceStoragePage.tsx` | 202 | `device-storage.page.ts` (T7) |
| `hooks/queries/use-device-queries.ts` | 58 | `device-detail.service.ts` queries (T1) |
| `hooks/commands/use-device-commands.ts` | 142 | `device-detail.service.ts` commands (T1) |

**Not in this module (→ fe-device-advanced):**

| Legacy | Lines | Module |
|---|---|---|
| `app/devices/[id]/metrics/DeviceMetricsPage.tsx` | 293 | fe-device-advanced |
| `app/devices/[id]/terminal/page.tsx` | (wrapper) | fe-device-advanced |
| `app/devices/[id]/settings/DeviceSettingsPage.tsx` | 1011 | fe-device-advanced |
| `hooks/domain/use-device-metrics.ts` | — | fe-device-advanced |
| `hooks/domain/use-ssh-session.ts` | — | fe-device-advanced |

## Endpoints consumed

| Endpoint | Used by | Typed? |
|---|---|---|
| `GET /devices/{id}` (`getDevice`) | T1, T2, T7 | ✅ `Device` schema |
| `PUT /devices/{id}` (`updateDevice`) | T1 (command) | ⚠️ 200 has no content schema |
| `GET /devices/{id}/alerts` (`listDeviceAlerts`) | T1, T5 | ⚠️ 200 has no content schema — fix in T1 |
| `PATCH /devices/{id}/alerts/{alertId}` (`updateDeviceAlert`) | T1, T5 | ✅ (patch body typed) |
| `GET /devices/{id}/commands` (`listDeviceCommands`) | T1, T3 | ⚠️ 200 has no content schema — fix in T1 |
| `POST /devices/{id}/commands` (`createDeviceCommand`) | T1, T3 | ✅ `DeviceCommand` response |
| `GET /devices/{id}/logs` (`getDeviceLogs`) | T1, T4 | ⚠️ 200 has no content schema — fix in T1 |
| `GET /monitoring/alerts` (`listAlerts`) | T5 (deviceId filter) | ✅ (fixed in fe-dashboard Q2) |
| `GET /monitoring/alerts/trend` (`getAlertsTrend`) | T5 | ✅ (fixed in fe-dashboard Q2) |
| `GET /monitoring/thresholds` (`listThresholds`) | T1, T6 | ⚠️ 200 has no content schema — fix in T1 |
| `POST /monitoring/thresholds` (`createThreshold`) | T1, T6 | ✅ (request body typed) |
| `PUT /monitoring/thresholds/{id}` (`updateThreshold`) | T1, T6 | ✅ (request body typed) |
| `POST /devices/claim` (`claimDevice`) | T1 (`regenerateToken`) | ✅ `ClaimResult` (fixed in fe-dashboard Q1) |

## Dependencies

`fe-dashboard` must be `done` because:
1. `DashboardService` exposes the device list that links to this module; the routing
   convention (`/app/devices/:id`) is established there.
2. `RegisterDeviceSheet` (fe-dashboard T5) handles the add-device flow; this module
   adds a `regenerateToken` path for `PENDING_SETUP` devices (different entry point,
   same `DashboardService.claimDevice` operation).
3. `DeviceTabNav` styling follows the same token system validated by fe-dashboard.

## Out of scope

| Concern | Module |
|---|---|
| Real-time metrics charts (CPU, memory, temperature time-series) | fe-device-advanced |
| SSH terminal (xterm) | fe-device-advanced |
| Device settings (SSH credentials, reporting intervals, update channel) | fe-device-advanced |
| Admin device list (`/admin/devices`) | fe-admin |
| System logs page (`/logs`) | fe-admin |
| Mobile-native push interactions | fe-mobile |
