# fe-admin — Tasks

Each task is one small PR. T1 (admin routes) must land first. T2–T5 and T8 are
independent once T1 is merged. T6 must precede T7 (T7 extends T6's page and service).

## Status

| # | Task | Status |
|---|---|---|
| T1 | Admin routes + lazy shell | ✅ done |
| T2 | AdminOverviewPage | ✅ done |
| T3 | AdminDevicesPage | ✅ done |
| T4 | AdminUsersPage | ✅ done |
| T5 | AdminNewUserPage | ✅ done |
| T6 | AdminLogsPage — table + filters + pagination | ✅ done |
| T7 | AdminLogsPage — search + CSV export | ✅ done |
| T8 | AdminSystemPage | ✅ done |

---

### T1 — Admin routes + lazy shell

- **Does:**
  - Add lazy-loaded admin routes in `app.routes.ts` (or a new `admin.routes.ts`):
    parent path `/app/admin` with `canActivate: [roleGuard(Role.ADMIN)]`, child routes
    for `''` → AdminOverviewPage, `devices`, `users`, `logs`, `system`.
    No `users/new` route — new-user is an `IonModal` inside AdminUsersPage (Q1).
  - Verify the shell rail's "Administer" group links point to these routes (they already
    exist from fe-ui-kit T9 — just confirm path alignment).
- **Output:** Navigating to `/app/admin` as an ADMIN user reaches the overview (empty
  placeholder). Non-ADMIN user is redirected to `/`. Unauthenticated user goes to `/login`.
- **Invariant:** No new guard code — composes existing `roleGuard(Role.ADMIN)` from
  `core/auth/guards.ts`.

---

### T2 — AdminOverviewPage

- **Does:**
  - Create `AdminStatsService` wrapping `getAdminStats` (`GET /admin/stats`) via `runQuery`.
  - Create `AdminOverviewPage` rendering:
    - 4 `ui-metric-card`s: Total Users, Total Devices, Active Devices, Open Alerts.
    - Quick-link cards (Devices, Users, Logs, System) — `routerLink` to sibling pages.
  - Skeleton loading state while `stats.loading()` is true.
- **Output:** `/app/admin` renders 4 stat cards with live numbers and quick-link cards.
- **Invariant:** Stat card values from `userCount`, `deviceCount`, `activeDevices`,
  `alertCount` (exact field names from `getAdminStats` response schema).

---

### T3 — AdminDevicesPage

- **Does:**
  - Create `AdminDevicesService` wrapping `listAdminDevices` (`GET /admin/devices`) with
    reactive `statusFilter` signal parameter.
  - Create `AdminDevicesPage` with:
    - 4 summary `ui-metric-card`s (Total, Online, Offline, Issues) derived from
      `body.meta?.stats` (if available) or computed from the list.
    - `UiSearchFieldComponent` for client-side hostname/IP/deviceId filtering.
    - Status dropdown (`UiSelectComponent`) — All / ONLINE / OFFLINE / MAINTENANCE / ERROR.
    - `DataTableComponent` with columns: Hostname, Device ID, Type, Status, IP Address,
      Last Seen, Alerts, Actions.
    - Row actions: **View** (routerLink to `/app/devices/:id`), **Restart** (ONLINE only),
      **Maintenance** / **Activate** toggle.
    - `IonModal` confirmation dialog for destructive actions (restart/maintenance/reset),
      posting to `POST /devices/{id}/commands` with `{ command: 'RESTART' | 'MAINTENANCE' | 'RESET' }`.
- **Output:** `/app/admin/devices` lists all devices, status filter works, action modal
  confirms and refreshes list on success.
- **Invariant:** Uses `listAdminDevices` (cross-tenant, SUPERADMIN-gated), not `listDevices`
  (tenant-scoped). `DeviceTypeBadge` and `StatusBadge` from the dashboard shared components.

---

### T4 — AdminUsersPage

- **Does:**
  - Create `AdminUsersService` wrapping `listAdminUsers` (`GET /admin/users`) with reactive
    `statusFilter` signal, `approveAdminUser` (`POST /admin/users/{id}/approve`), and
    `updateUser` (`PUT /users/{id}`) for activate/suspend.
  - Create `AdminUsersPage` with:
    - `UiSearchFieldComponent` for client-side name/email filter.
    - Status dropdown — All / PENDING / ACTIVE / SUSPENDED.
    - `DataTableComponent` with columns: Name, Email, Role, Status, Customer, Joined, Actions.
    - Row actions (shown by status):
      - PENDING → **Approve** / **Reject** (calls `approveAdminUser`).
      - ACTIVE → **Suspend** (calls `updateUser` with `{ status: 'SUSPENDED' }`).
      - SUSPENDED → **Activate** (calls `updateUser` with `{ status: 'ACTIVE' }`).
    - Confirmation `IonAlert` before approve/reject/suspend actions.
- **Output:** `/app/admin/users` lists users; approve/reject works for PENDING users;
  suspend/activate toggles work for ACTIVE/SUSPENDED users.
- **Invariant:** SUPERADMIN-only actions (approve/reject) are hidden for ADMIN role.
  Uses `auth.role()` signal to conditionally show/hide.

---

### T5 — AdminNewUserModal

- **Does:**
  - Create `AdminNewUserModal` as a standalone `IonModal` component (no route).
  - Add a "New User" `IonFab` / header button to `AdminUsersPage` that opens the modal
    via Angular's `ModalController` or inline `<ion-modal [isOpen]="...">`.
  - Modal contains a reactive form:
    - Email (`UiInputComponent`, type=email, required).
    - Username (`UiInputComponent`, required).
    - Password (`UiInputComponent`, type=password, required, min 8 chars).
    - Role (`UiSelectComponent`, options: USER / ADMIN / READONLY).
    - Customer (`UiSelectComponent`, populated from `GET /admin/customers` via a
      one-shot `runQuery` call inside the modal — no dedicated service needed).
  - Submit calls `POST /users` (`createUser`). On success, dismisses modal and triggers
    a refresh of `AdminUsersPage`'s user list (via a `reload` signal or output event).
    On error, shows inline validation message inside the modal (modal stays open).
  - Cancel / backdrop dismiss closes the modal without submitting.
- **Output:** Clicking "New User" opens the modal; submitting a valid form dismisses it
  and the new user row appears in the list immediately.
- **Invariant:** Customer picker uses `GET /admin/customers`. Form uses Angular Reactive
  Forms; `UiInputComponent` binds via `formControlName`. No route for `users/new` exists.

---

### T6 — AdminLogsPage (table + filters + pagination)

- **Does:**
  - Create `AdminLogsService` wrapping `getAdminLogs` (`GET /admin/logs`) with reactive
    signals for `levelFilter`, `deviceFilter`, `sourceFilter`, `page`. Returns `logs`,
    `pagination`, and `filterOptions` (device list + source list from `body.meta.filters`).
  - Create `AdminLogsPage` with:
    - Level dropdown: All / DEBUG / INFO / WARN / ERROR / FATAL.
    - Device dropdown: populated from `filterOptions.devices`.
    - Source dropdown: visible only when `filterOptions.sources.length > 0`.
    - `DataTableComponent` with columns: Timestamp, Level (badge + icon), Device, Source,
      Message (mono).
    - Server-side pagination controls (Previous / page numbers / Next).
    - Skeleton while loading; `ui-empty-state` when no results.
    - "Last updated" timestamp display and Refresh button.
- **Output:** `/app/admin/logs` renders logs table; changing any dropdown re-fetches;
  pagination controls navigate pages.
- **Invariant:** Filters trigger server re-fetch (not client filtering). Source dropdown
  hidden when `filterOptions.sources` is empty (matches legacy conditional render).

---

### T7 — AdminLogsPage (search + CSV export)

- **Does:**
  - Add to `AdminLogsService`: `searchQuery` signal parameter passed to `getAdminLogs`
    as `&search=...`; resets `page` to 1 on any search change.
  - Extend `AdminLogsPage` with:
    - `UiSearchFieldComponent` with 500ms debounce (RxJS `debounceTime` + `distinctUntilChanged`).
    - **Export CSV** button: disabled when `logs` is empty. On click, generates CSV in-browser
      from current `logs` array (Timestamp, Level, Device, Source, Message) and triggers
      download. No backend call — client-only using `Blob` + `URL.createObjectURL`.
- **Output:** Typing in the search field re-fetches after 500ms pause; Export CSV downloads
  a `.csv` file named `logs_export_<ISO-date>.csv` with the currently visible page of logs.
- **Invariant:** Debounce uses RxJS, not `setTimeout`, so change detection stays Angular-native.
  CSV export uses `Date` (allowed — stamped after data arrives, not in workflow script).

---

### T8 — AdminSystemPage

- **Does:**
  - Create `AdminSystemService` wrapping `getAdminSystem` (`GET /admin/system`) with a
    30-second auto-refresh interval implemented as an RxJS `interval(30_000).pipe(startWith(0))`
    that triggers re-fetch via the signal helper.
  - Create `AdminSystemPage` with:
    - Three summary cards: System (hostname, platform, uptime), Database (user/device/alert/
      customer counts, `status` health indicator), Application (version, Node.js, environment,
      app uptime).
    - Two resource cards: CPU Utilization (`IonProgressBar`, load averages), Memory Usage
      (`IonProgressBar`, total/used/free formatted as KB/MB/GB, heap utilization).
    - Recent Activity table (device hostname + last-updated timestamp) from
      `database.recentActivity`.
    - Platform Features grid (Multi-Tenant, Advanced Metrics, Tailscale) — colored dot
      per boolean.
    - "Last updated" timestamp and manual Refresh button.
- **Output:** `/app/admin/system` shows live health metrics, auto-refreshes every 30s,
  manual refresh button triggers immediate re-fetch.
- **Invariant:** `formatBytes` and `formatUptime` are pure functions defined in the page
  TS file. No `Progress` HeroUI component — uses `IonProgressBar` (Ionic native).
