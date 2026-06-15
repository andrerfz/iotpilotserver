# fe-admin — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `roleGuard(Role.ADMIN)` blocks non-admin users; admin routes resolve without 404; rail links navigate correctly |
| T2 | Stats cards display non-zero values seeded in dev DB; quick-link cards navigate to sibling pages |
| T3 | Device list loads; status filter re-fetches; search filters rows client-side; action modal posts correct command; list refreshes after action |
| T4 | User list loads with all status groups; approve/reject changes PENDING user status; suspend/activate toggles work; confirmation alert shown before each action |
| T5 | Modal opens from "New User" button; form validates all required fields; valid submission dismisses modal and new user row appears in list; error keeps modal open with inline message |
| T6 | Logs table loads; level/device/source dropdowns trigger server re-fetch; pagination controls work and display correct total; source dropdown hidden when no sources available |
| T7 | Typing in search input waits 500ms before re-fetching; Export CSV button produces a valid `.csv` file in the browser; file contains current page rows |
| T8 | System health displays; progress bars reflect live CPU/memory values; auto-refresh fires at 30s interval; manual refresh button re-fetches immediately |

## Module-level scenarios

```gherkin
Feature: Admin route protection

  Scenario: Non-admin user blocked from admin pages
    Given a logged-in USER with role "USER"
    When the user navigates to "/app/admin"
    Then the app redirects to "/"
    And no admin content is visible

  Scenario: Admin user accesses overview
    Given a logged-in user with role "ADMIN"
    When the user navigates to "/app/admin"
    Then the overview page loads
    And four metric cards display numeric values from GET /admin/stats

Feature: Admin device management

  Scenario: Filter devices by status
    Given the admin devices page is loaded
    When the admin selects "ONLINE" from the status dropdown
    Then only ONLINE devices appear in the table
    And the stat cards update to reflect filtered counts

  Scenario: Restart a device
    Given an ONLINE device row is visible
    When the admin clicks "Restart"
    Then a confirmation modal appears
    When the admin clicks "Confirm"
    Then POST /devices/{id}/commands is called with command "RESTART"
    And the device list refreshes

Feature: Admin user management

  Scenario: Approve a pending user
    Given a PENDING user row is visible
    When the admin clicks "Approve"
    Then a confirmation alert appears
    When the admin confirms
    Then POST /admin/users/{id}/approve is called with action "approve"
    And the user's status changes to ACTIVE in the table

  Scenario: Create a new user via modal
    Given the admin is on "/app/admin/users"
    When the admin clicks "New User"
    Then an IonModal opens with the create-user form
    When the admin fills in email, username, password, role, and customer
    And clicks "Create"
    Then POST /users is called
    And the modal closes
    And the new user appears in the user list

Feature: Admin logs viewer

  Scenario: Filter logs by level
    Given the logs page is open
    When the admin selects "ERROR" from the level dropdown
    Then GET /admin/logs is called with level=ERROR
    And only ERROR logs appear in the table

  Scenario: Search logs with debounce
    Given the logs page is open
    When the admin types "timeout" in the search field
    And waits 500ms
    Then GET /admin/logs is called with search=timeout

  Scenario: Export logs as CSV
    Given the logs table has rows
    When the admin clicks "Export CSV"
    Then a file named "logs_export_<date>.csv" is downloaded
    And it contains the currently visible log rows

Feature: Admin system health

  Scenario: View system health
    Given the admin navigates to "/app/admin/system"
    Then three summary cards appear (System, Database, Application)
    And CPU and memory progress bars show non-zero values
    And the "last updated" timestamp is visible

  Scenario: Auto-refresh
    Given the system page is open
    When 30 seconds elapse
    Then GET /admin/system is called again
    And the "last updated" timestamp updates
```

## Parity checklist

| Legacy page | Behaviors to match |
|---|---|
| `admin/page.tsx` | 4 stat cards (userCount, deviceCount, alertCount, activeDevices); quick links to all admin sub-pages |
| `admin/devices/page.tsx` | Status filter (All/ONLINE/OFFLINE/MAINTENANCE/ERROR); client-side search by hostname/deviceId/IP; restart/maintenance/activate actions with confirmation modal; stat cards (total/online/offline/issues) |
| `admin/users/page.tsx` | Status filter; approve/reject for PENDING; suspend for ACTIVE; activate for SUSPENDED; SUPERADMIN-only action visibility |
| `admin/users/new/page.tsx` | Email/username/password/role fields; customer select populated from `/admin/customers`; cancel/backdrop closes modal without submitting |
| `admin/logs/page.tsx` | Level/device/source filters (server-side); 500ms debounced search; pagination with page window; CSV export (browser-side Blob); last-updated timestamp |
| `admin/system/page.tsx` | System/Database/Application summary cards; CPU utilization + load averages; memory total/used/free + heap; recent activity table; platform features grid; 30s auto-refresh |

## Exit checklist (module → done)

- [ ] All tasks T1–T8 merged and green in CI
- [ ] `make lint` and `make test-unit` pass for `apps/frontend-ng`
- [ ] README module table updated to `done`
- [ ] Open questions all `_resolved_`
- [ ] `fe-mobile` can be deepened (this module delivers no mobile blockers; admin UX on mobile deferred)
