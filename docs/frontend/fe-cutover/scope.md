# fe-cutover — Scope

## Purpose

fe-cutover is the final migration step. It delivers a verified, production-switched
frontend by: (1) running behavioral parity QA between the legacy Next.js app and the new
Angular app on every page, (2) switching the Traefik router so traffic flows to
`iotpilot-ng` instead of `iotpilot-app`, and (3) permanently removing `apps/frontend`.
When done, the Angular app is the only frontend in production, the Docker Compose files
are clean, and the legacy codebase is gone from the repo.

"Done" unblocks fe-mobile (which is now the only frontend-ng dependency still pending)
and closes the migration ledger opened in fe-foundation.

---

## Binding upstream decisions

- **Angular flavor: standalone + signals, no NgModules** → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q1
- **Container name `iotpilot-server-ng` (local) / `iotpilot-ng` (prod)**; legacy stays `apps/frontend` until removal here → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q5
- **Test runner: Vitest via `@analogjs/vitest-angular`** → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q4
- **Zoneless revisit at fe-cutover** — decide whether to migrate to `provideZonelessChangeDetection()` after verifying ngx-echarts and SshTerminalComponent assumptions → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q6
- **API client: generated from `docs/openapi.yml`**; `make route-check` / `make ng-api-check` guard drift → [fe-core/open-questions.md](../fe-core/open-questions.md) Q1
- **Token strategy: bearer JWT from memory; cookie as web persistence backstop**; CSRF mitigation required on `/auth/refresh` → [fe-core/open-questions.md](../fe-core/open-questions.md) Q2
- **SSH terminal: REST command execution (not real xterm.js PTY)** — behavioral parity only → [fe-device-advanced/open-questions.md](../fe-device-advanced/open-questions.md) Q1
- **AdminNewUserPage implemented as `IonModal`**, no `/admin/users/new` route → [fe-admin/open-questions.md](../fe-admin/open-questions.md) Q1

---

## Target structure

No new feature code is produced here. This module operates on infrastructure files and
produces documentation, CI scripts, and Docker Compose changes.

```
infra/docker/
├── docker-compose.local.yml    # T3: add iotpilot-ng Traefik labels; remove legacy labels
├── docker-compose.yml          # T5: uncomment iotpilot-ng; remove/disable iotpilot-app

infra/nginx/
└── frontend-ng.conf            # verified in T2; unchanged

.github/workflows/ (or Makefile)
└── parity smoke-test target    # T2: make ng-parity or equivalent

apps/
└── frontend/                   # T7: git rm -r; commit; module done
```

---

## Legacy inventory replaced

This module does not replace source files — it terminates them. Every legacy file in
`apps/frontend/` is removed in T7.

| Legacy artefact | Type | Fate |
|---|---|---|
| `apps/frontend/` (whole tree) | Next.js 14 app | Removed in T7 |
| `apps/frontend/middleware.ts` | Next.js middleware (auth + proxy routing) | Superseded by Angular guards + Express backend |
| `apps/frontend/src/app/api/[...path]/route.ts` | Catch-all API proxy | Superseded by Angular's `proxy.conf.json` (dev) + Traefik path routing (prod) |
| `apps/frontend/src/app/api/health/route.ts` | Health endpoint | Superseded by Express `GET /api/health` |
| `infra/docker/docker-compose.local.yml` — `iotpilot-app` service | Legacy Next.js container | Removed/disabled in T3 |
| `infra/docker/docker-compose.yml` — `iotpilot-app` service | Legacy Next.js container | Removed/disabled in T5 |

### Legacy page inventory (behavioral parity reference)

All pages listed below have Angular equivalents (see parity checklist in acceptance.md).
None required 1:1 file porting here — they are parity-verified, then the sources are deleted.

| Legacy page (apps/frontend/src/app) | Lines | Angular equivalent |
|---|---|---|
| `page.tsx` (root redirect → /dashboard) | 5 | Angular router `{ path: '', redirectTo: 'dashboard' }` |
| `login/page.tsx` + `TwoFactorForm.tsx` | 8 + 100 | `auth/pages/login/login.page.ts` |
| `register/page.tsx` | 8 | `auth/pages/register/register.page.ts` |
| `devices/add/page.tsx` | 224 | `RegisterDeviceSheet` (bottom-sheet pattern) |
| `devices/[id]/page.tsx` (redirect) | 9 | `DEVICE_DETAIL_ROUTES` default → `device-overview` |
| `devices/[id]/alerts/page.tsx` + `DeviceAlertsPage.tsx` | 11 + 611 | `dashboard/pages/device-alerts/device-alerts.page.ts` |
| `devices/[id]/commands/page.tsx` + `DeviceCommandsPage.tsx` | 4 + 613 | `dashboard/pages/device-commands/device-commands.page.ts` |
| `devices/[id]/logs/page.tsx` + `DeviceLogsPage.tsx` | 5 + 356 | `dashboard/pages/device-logs/device-logs.page.ts` |
| `devices/[id]/metrics/page.tsx` + `DeviceMetricsPage.tsx` | 5 + 293 | `dashboard/pages/device-metrics/device-metrics.page.ts` |
| `devices/[id]/network/page.tsx` + `DeviceNetworkPage.tsx` | 5 + 193 | `dashboard/pages/device-network/device-network.page.ts` |
| `devices/[id]/settings/page.tsx` + `DeviceSettingsPage.tsx` | 6 + 1011 | `dashboard/pages/device-settings/device-settings.page.ts` (split across T5+T6 in fe-device-advanced) |
| `devices/[id]/storage/page.tsx` + `DeviceStoragePage.tsx` | 5 + 202 | `dashboard/pages/device-storage/device-storage.page.ts` |
| `devices/[id]/terminal/page.tsx` | 201 | `dashboard/pages/device-terminal/device-terminal.page.ts` |
| `settings/page.tsx` (redirect) | 5 | `SETTINGS_ROUTES` default → `profile` |
| `settings/profile/page.tsx` + `ProfileSettingsClient.tsx` | 9 + 284 | `settings/pages/profile/settings-profile.page.ts` |
| `settings/security/page.tsx` | 473 | `settings/pages/security/settings-security.page.ts` |
| `settings/system/page.tsx` | 326 | `settings/pages/system/settings-system.page.ts` |
| `settings/notifications/page.tsx` | 191 | `settings/pages/notifications/settings-notifications.page.ts` |
| `admin/page.tsx` | 99 | `admin/pages/admin-overview/admin-overview.page.ts` |
| `admin/devices/page.tsx` | 323 | `admin/pages/admin-devices/admin-devices.page.ts` |
| `admin/users/page.tsx` | 328 | `admin/pages/admin-users/admin-users.page.ts` |
| `admin/users/new/page.tsx` | 231 | `admin/pages/admin-new-user/admin-new-user.page.ts` (IonModal) |
| `admin/logs/page.tsx` | 408 | `admin/pages/admin-logs/admin-logs.page.ts` |
| `admin/system/page.tsx` | 399 | `admin/pages/admin-system/admin-system.page.ts` |

**Total legacy source removed:** ~7,200 lines across 39 files.

---

## Endpoints consumed

fe-cutover produces no new API calls. All endpoints were verified in their respective
feature module scopes. The only cutover-specific API concern is:

| Concern | Endpoint | Notes |
|---|---|---|
| Angular app health (post-cutover monitoring) | `GET /api/health` | Express backend; parity with legacy `/api/health` route. Angular nginx serves no API. |
| CSRF on token refresh | `POST /api/auth/refresh` | See fe-core Q2. Must be hardened before prod cutover (Q3 below). |

---

## Dependencies

`fe-cutover` depends on **all page modules**:

| Module | Status | Why needed |
|---|---|---|
| fe-foundation | ✅ done | Docker/CI tooling, container names |
| fe-core | ✅ done | Auth guards, API client, token strategy |
| fe-ui-kit | done | Shell, kit components |
| fe-auth | ✅ done | Login/register parity |
| fe-settings | ✅ done | Settings parity |
| fe-dashboard | ✅ done | Dashboard/devices parity |
| fe-device-detail | ✅ done | Device sub-pages parity |
| fe-device-advanced | ✅ done | Metrics/terminal/device-settings parity |
| fe-admin | pending (all tasks done, status not flipped) | Admin parity |

fe-mobile is a **sibling** (not a dependency of fe-cutover): mobile ships after cutover,
using the now-canonical Angular app.

---

## Out of scope

- **fe-mobile**: Capacitor builds, push notifications, signed APKs — separate module.
- **Backend changes**: `apps/backend` and `packages/core` are not touched.
- **Grafana / InfluxDB UIs**: these are separate Traefik-routed services; their routing
  is unchanged.
- **New features**: cutover is a quality/infrastructure step, not a feature sprint.
- **Monitoring pipeline (Loki/Prometheus)**: infra unchanged; only the app container is
  swapped.
- **`/logs` shell route (placeholder)**: the route exists as a `PlaceholderPage` in the
  Angular app — it is not in the legacy Next.js app either (no `/logs` page exists there).
  This is a future feature outside migration scope.
