# fe-admin — Open Questions

## Q1 _resolved_ — AdminNewUserPage: routed page vs IonModal

**Decision:** Use `IonModal` overlaying `AdminUsersPage` (prototype pattern). No
`/admin/users/new` child route — the modal is opened from a "New User" button in
`AdminUsersPage`. `AdminNewUserPage` becomes `AdminNewUserModal` (a standalone component
with `IonModal` as its host). T1 does not scaffold a `users/new` route.

**Resolved:** 2026-06-15
**Applies to:** T1, T5

---

## Q2 _resolved_ — Stats endpoint field alignment

**Decision:** `GET /admin/stats` returns `{ userCount, deviceCount, alertCount, activeDevices }`.
The legacy overview page binds these exact field names. No mapping needed.

**Resolved:** 2026-06-14
**Applies to:** T2

---

## Q3 _resolved_ — Admin device list: `/admin/devices` vs `/devices`

**Decision:** Use `GET /admin/devices` (cross-tenant, SUPERADMIN-gated) for the admin
devices page, not `GET /devices` (tenant-scoped). The legacy `admin/devices/page.tsx`
incorrectly used the tenant-scoped endpoint; the new implementation corrects this.
SUPERADMIN-only: non-SUPERADMIN admins will see an empty list or 403 from the backend
(acceptable — the route is still accessible, just empty).

**Resolved:** 2026-06-14
**Applies to:** T3

---

## Q4 _resolved_ — Admin user list: `/admin/users` vs `/users`

**Decision:** Use `GET /admin/users` for listing in AdminUsersPage (ADMIN+, spec-correct).
The legacy mixed `/api/users` (tenant-scoped) with `/api/admin/users/:id/approve`.
The new version uses the admin endpoint throughout for consistency with role semantics.

**Resolved:** 2026-06-14
**Applies to:** T4

---

## Q5 _resolved_ — IonProgressBar vs `ui-progress` wrapper

**Decision:** `AdminSystemPage` uses `IonProgressBar` directly from `@ionic/angular/standalone`.
No custom `ui-progress` wrapper exists in the kit, and creating one for a single use is
not justified. The eslint `no-restricted-imports` rule allows direct Ionic imports when no
kit wrapper exists for a given component.

**Resolved:** 2026-06-14
**Applies to:** T8

---

## Q6 _resolved_ — Logs split strategy (>400 lines)

**Decision:** `admin/logs/page.tsx` is 408 legacy lines. Split into:
- T6: `AdminLogsService` + table + dropdown filters (level/device/source) + pagination.
- T7: Extend service with `searchQuery` signal + `UiSearchFieldComponent` + CSV export.

The split is along the axis of "viewing" vs "searching/exporting" — both are independently
useful and testable.

**Resolved:** 2026-06-14
**Applies to:** T6, T7
