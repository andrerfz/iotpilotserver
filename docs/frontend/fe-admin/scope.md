# fe-admin — Scope

## Purpose

Deliver all ADMIN/SUPERADMIN pages under the `/app/admin` route prefix: overview stats,
cross-tenant device management, user management (list, approve, create), device logs
viewer, and system health. Completing this module unblocks `fe-mobile` (no admin-specific
mobile concerns) and marks the Angular migration feature-complete ahead of `fe-cutover`.

## Binding upstream decisions

- **Angular standalone + signals, no NgModules** → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md)
- **Generated API client only** → [fe-core/open-questions.md](../fe-core/open-questions.md)
- **DataTable: `overflow-x: auto` wrapper, sortable columns, client pagination** → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q2 _resolved_
- **Visual contract: prototype wins over legacy on looks** → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q7 _resolved_
- **`roleGuard(Role.ADMIN)` already exists in `core/auth/guards.ts`** — admin routes compose it directly; no new guard needed
- **`ui-` prefix for kit components, `app-` for shell** → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q4 _resolved_

## Target structure

```
apps/frontend-ng/src/app/features/admin/
├── pages/
│   ├── admin-overview/
│   │   ├── admin-overview.page.ts
│   │   └── admin-overview.page.html
│   ├── admin-devices/
│   │   ├── admin-devices.page.ts
│   │   └── admin-devices.page.html
│   ├── admin-users/
│   │   ├── admin-users.page.ts
│   │   └── admin-users.page.html
│   ├── admin-new-user/
│   │   ├── admin-new-user.modal.ts
│   │   └── admin-new-user.modal.html
│   ├── admin-logs/
│   │   ├── admin-logs.page.ts
│   │   └── admin-logs.page.html
│   └── admin-system/
│       ├── admin-system.page.ts
│       └── admin-system.page.html
└── services/
    ├── admin-stats.service.ts
    ├── admin-devices.service.ts
    ├── admin-users.service.ts
    ├── admin-logs.service.ts
    └── admin-system.service.ts
```

Routes live under `apps/frontend-ng/src/app/app.routes.ts` (or a lazy-loaded
`admin.routes.ts`) with `canActivate: [roleGuard(Role.ADMIN)]` on the parent.

## Legacy inventory replaced

| Legacy (`apps/frontend/src`) | Lines | Replacement |
|---|---|---|
| `app/admin/layout.tsx` | 43 | `roleGuard(Role.ADMIN)` on parent route (already exists) |
| `app/admin/page.tsx` | 99 | `AdminOverviewPage` + `AdminStatsService` |
| `app/admin/devices/page.tsx` | 323 | `AdminDevicesPage` + `AdminDevicesService` |
| `app/admin/users/page.tsx` | 328 | `AdminUsersPage` + `AdminUsersService` |
| `app/admin/users/new/page.tsx` | 231 | `AdminNewUserModal` (IonModal inside AdminUsersPage — no route) |
| `app/admin/logs/page.tsx` | 408 | `AdminLogsPage` + `AdminLogsService` — **split** (>400 lines): T6 = table+filters+pagination; T7 = search+CSV export |
| `app/admin/system/page.tsx` | 399 | `AdminSystemPage` + `AdminSystemService` |

The legacy `admin/layout.tsx` renders an `<AdminSidebar>` (links to overview/devices/
users/logs/system) and wraps in `<AdminGuard>` (role check). In Angular, both concerns
are handled by the router: `roleGuard(Role.ADMIN)` on the parent route + the app shell's
existing side rail already renders admin links (Administer group).

## Endpoints consumed

All endpoints exist in `docs/openapi.yml`.

| Endpoint | operationId | Used by |
|---|---|---|
| `GET /admin/stats` | `getAdminStats` | AdminOverviewPage |
| `GET /admin/devices` | `listAdminDevices` | AdminDevicesPage |
| `POST /devices/{id}/commands` | `createDeviceCommand` | AdminDevicesPage (restart/maintenance/reset) |
| `GET /admin/users` | `listAdminUsers` | AdminUsersPage |
| `PUT /users/{id}` | `updateUser` | AdminUsersPage (activate/suspend) |
| `POST /admin/users/{id}/approve` | `approveAdminUser` | AdminUsersPage (approve/reject) |
| `GET /admin/customers` | `listAdminCustomers` | AdminNewUserPage (customer picker) |
| `POST /users` | `createUser` | AdminNewUserPage |
| `GET /admin/logs` | `getAdminLogs` | AdminLogsPage |
| `GET /admin/system` | `getAdminSystem` | AdminSystemPage |

**Legacy divergence noted:** `admin/devices/page.tsx` calls `GET /api/devices` (the
tenant-scoped list), not `GET /api/admin/devices`. The new implementation uses
`GET /admin/devices` (cross-tenant, SUPERADMIN) as intended by the spec. Similarly,
`admin/users/page.tsx` mixes `/api/users` with `/api/admin/users/:id/approve` — the
new implementation uses `GET /admin/users` for listing (ADMIN+, spec-correct).

## Dependencies

- **fe-ui-kit** (done) — `DataTableComponent`, `MetricCardComponent`, `EmptyStateComponent`,
  `UiInputComponent`, `UiSearchFieldComponent`, `UiSelectComponent`, `BadgeComponent`,
  `BottomSheetComponent` all already exist; `ProgressComponent` may need checking (used
  by AdminSystemPage). `StatusBadge` and `DeviceTypeBadge` from the dashboard feature's
  shared components.
- **fe-core** (done) — `AuthService`, `roleGuard`, generated API client, `runQuery`/
  `runCommand` signal helpers, `CommandBus`, `QueryBus`.

## Out of scope

- **Admin sidebar** — the app shell's side rail (Administer group) is implemented in
  `fe-ui-kit` (T9) and already renders admin links. `fe-admin` only provides the page
  implementations.
- **SUPERADMIN-only customer management** — `GET /admin/customers` is used only as a
  data source for the "new user" customer picker. A full customer CRUD page is not in
  scope for this module.
- **Real-time log streaming** — legacy polls on demand; the new implementation matches
  that pattern. WebSocket/SSE log streaming is out of scope.
- **Mobile-specific admin UX** — deferred to `fe-mobile`.
