# fe-device-advanced — Scope

## Purpose

Extends the `DeviceDetailPage` shell established in fe-device-detail with three
additional child-route tabs: real-time metrics charts (`DeviceMetricsPage`), SSH command
terminal (`DeviceTerminalPage`), and device configuration (`DeviceSettingsPage`). On
completion the device detail section reaches full behavioral parity with the legacy app
and the three deferred tabs (`metrics`, `terminal`, `settings`) are no longer stubs.

## Binding upstream decisions

- Angular standalone components + signals, no NgModules, no NgRx →
  [fe-foundation/open-questions.md](../fe-foundation/open-questions.md)
- All HTTP via the generated API client (`core/api/generated/`) — no hand-written fetch →
  [fe-core/open-questions.md](../fe-core/open-questions.md)
- `runQuery()` signals helper for server state — fe-core T8
- `shared/ui` wrappers only in features; no direct `@ionic/angular` imports →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q3
- ECharts via `ngx-echarts` already installed; `provideEchartsCore()` registered in
  `main.ts` → [fe-dashboard/open-questions.md](../fe-dashboard/open-questions.md) Q3
- Socket subscriptions are page-level (subscribe on init, unsubscribe on destroy) →
  [fe-dashboard/open-questions.md](../fe-dashboard/open-questions.md) Q6
- `DeviceTabNavComponent` uses `RouterLink` + `routerLinkActive`; fe-device-advanced
  appends Metrics / Terminal / Settings tabs →
  [fe-device-detail/open-questions.md](../fe-device-detail/open-questions.md) Q2
- Alert threshold *records* (`/monitoring/thresholds`) belong to fe-device-detail T6.
  Device-level settings thresholds (`cpuThreshold`, `memoryThreshold`, etc. stored in
  `DeviceSettings` via `PUT /devices/{id}/settings`) belong here →
  [fe-device-detail/open-questions.md](../fe-device-detail/open-questions.md) Q4
- Prototype is the visual/UX contract; legacy is the behavioral parity reference →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q7

## Target structure

```
apps/frontend-ng/src/app/features/dashboard/
├── pages/
│   ├── device-metrics/
│   │   ├── device-metrics.page.ts
│   │   ├── device-metrics.page.html
│   │   ├── device-metrics.page.scss
│   │   └── device-metrics.page.spec.ts
│   ├── device-terminal/
│   │   ├── device-terminal.page.ts
│   │   ├── device-terminal.page.html
│   │   ├── device-terminal.page.scss
│   │   └── device-terminal.page.spec.ts
│   └── device-settings/
│       ├── device-settings.page.ts
│       ├── device-settings.page.html
│       ├── device-settings.page.scss
│       └── device-settings.page.spec.ts
├── components/
│   ├── ssh-terminal/
│   │   ├── ssh-terminal.component.ts
│   │   ├── ssh-terminal.component.html
│   │   ├── ssh-terminal.component.scss
│   │   └── ssh-terminal.component.spec.ts
│   └── device-tab-nav/          ← extended (three tabs added)
└── services/
    └── device-detail.service.ts  ← extended (new query surfaces + commands)
```

## Legacy inventory replaced

| Legacy (apps/frontend/src) | Lines | Replacement |
|---|---|---|
| `app/devices/[id]/metrics/DeviceMetricsPage.tsx` | 293 | `pages/device-metrics/device-metrics.page.ts` |
| `app/devices/[id]/metrics/page.tsx` | 3 | child route entry in `device-detail.routes.ts` |
| `app/devices/[id]/terminal/page.tsx` | 201 | `pages/device-terminal/device-terminal.page.ts` |
| `components/ssh-terminal.tsx` | 52 | `components/ssh-terminal/ssh-terminal.component.ts` |
| `hooks/domain/use-ssh-session.ts` | 40 | `executeSSH()` method on `DeviceDetailService` |
| `app/devices/[id]/settings/DeviceSettingsPage.tsx` | 1,011 | `pages/device-settings/device-settings.page.ts` split across T5 + T6 |
| `app/devices/[id]/settings/page.tsx` | 3 | child route entry in `device-detail.routes.ts` |

`DeviceSettingsPage.tsx` (1,011 lines) exceeds the 400-line threshold. It is split at the
section boundary: T5 implements General + Monitoring, T6 adds Network + Agent + Security
+ Rotate Key. The Angular version uses Reactive Forms throughout — significantly fewer
lines than the React equivalent.

## Endpoints consumed

| Endpoint | Used by |
|---|---|
| `GET /devices/{id}/metrics?period=` | `DeviceDetailService.deviceMetrics` → `DeviceMetricsPage` |
| `POST /devices/{id}/ssh` | `DeviceDetailService.executeSSH()` → `SshTerminalComponent` |
| `GET /devices/{id}/settings` | `DeviceDetailService.deviceSettings` → `DeviceSettingsPage` |
| `PUT /devices/{id}/settings` | `DeviceDetailService.updateSettings()` → `DeviceSettingsPage` |
| `POST /devices/{id}/rotate-key` | `DeviceDetailService.rotateKey()` — already in service from fe-device-detail T1 |

## Dependencies

`fe-device-detail` — must be done first. This module extends `DeviceDetailService`,
`DeviceTabNavComponent`, and `device-detail.routes.ts` created there.

## Out of scope

- Real WebSocket PTY / xterm.js terminal — requires a backend SSH proxy (WebSocket)
  that does not exist in the current OpenAPI spec. Q1 resolved: port REST command
  execution as-is.
- Alert threshold *records* (`/monitoring/thresholds`) — fe-device-detail T6.
- Admin device management (delete device, rotate key for admin, bulk operations) — fe-admin.
