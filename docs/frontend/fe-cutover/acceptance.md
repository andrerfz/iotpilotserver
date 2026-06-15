# fe-cutover — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `make ng-lint && make ng-type-check && make ng-test && make ng-api-check` all exit 0. fe-admin README row shows `✅ done`. |
| T2 | `make ng-parity` exits 0 against the local compose stack. Manual parity instructions documented. |
| T3 | Both frontends reachable via Traefik. Full parity checklist (see below) walked manually. PR includes a QA log. |
| T4 | `make ng-parity` exits 0 against `iotpilotserver.test` (now Angular). Login + dashboard + device detail + settings manually verified. |
| T5 | `iotpilot-ng` serving `dashboarddev.iotpilot.app`. `make ng-parity` (or equivalent) passes. `docker compose ps` shows no `iotpilot-app` running. |
| T6 | Production traffic green for 24+ consecutive hours. Error rate unchanged vs legacy baseline. `iotpilot-app` block removed from `docker-compose.yml`. |
| T7 | `find . -path '*/apps/frontend*' | wc -l` returns 0. `make ng-lint && make ng-type-check && make ng-test` pass. README `fe-cutover` row shows `✅ done`. |
| T8 | Either: app running zoneless with full test suite green and ECharts/terminal verified; or: documented finding in fe-foundation Q6 explaining why migration is deferred. |

---

## Module-level scenarios

```gherkin
Feature: Frontend cutover smoke test

  Background:
    Given the Angular frontend is serving the production domain
    And the Express backend is reachable at /api/*

  Scenario: Unauthenticated user is redirected to login
    When I navigate to /dashboard
    Then I am redirected to /login
    And the login page renders without JavaScript errors

  Scenario: Authenticated user can log in and reach the dashboard
    Given I am on the login page
    When I submit valid credentials
    Then I am redirected to /dashboard
    And the device list loads within 5 seconds

  Scenario: Device detail page renders all tabs
    Given I am authenticated
    When I navigate to /devices/<valid-device-id>
    Then the device overview tab loads
    And I can navigate to alerts, commands, logs, network, storage, metrics, terminal, settings tabs
    And each tab returns HTTP 200 without console errors

  Scenario: Admin user can access admin pages
    Given I am authenticated as an ADMIN user
    When I navigate to /admin
    Then the admin overview page loads
    And I can navigate to /admin/devices, /admin/users, /admin/logs, /admin/system

  Scenario: Non-admin user is blocked from admin pages
    Given I am authenticated as a regular USER
    When I navigate to /admin
    Then I am redirected away from /admin (to /dashboard or /login)

  Scenario: Settings pages load for authenticated user
    Given I am authenticated
    When I navigate to /settings/profile
    Then the profile form renders with user data pre-filled
    And I can navigate to security, notifications, system settings

  Scenario: API health check returns healthy
    When I GET /api/health
    Then the response is 200 with body containing status "healthy"
    And the response does NOT come from the Next.js frontend (no "service":"iotpilot-frontend" field)

  Scenario: Backend API is not affected by frontend switch
    Given the Angular app is serving the frontend
    When a device sends a heartbeat to POST /api/devices/heartbeat
    Then the backend accepts and processes the heartbeat normally

  Scenario: SPA routing works after direct URL navigation
    Given the Angular app is served by nginx
    When I navigate directly to /devices/<id>/metrics in the browser
    Then nginx serves index.html and Angular's router renders the metrics page
    And I do not receive a 404

  Scenario: Static assets are served with long-lived cache headers
    When I request a content-hashed JS bundle (*.js)
    Then the response includes Cache-Control: public, immutable
    And Expires is approximately 1 year in the future
```

---

## Parity checklist

Every legacy page route must be verified against its Angular equivalent before T4 is
merged (local routing switch) and again before T6 (production switch).

**Verification method:** For each row, open both legacy (`iotpilotserver.test` → legacy)
and Angular (`ng.iotpilotserver.test` → Angular, during T3 side-by-side window) with the
same logged-in session and check each behavior listed.

| Legacy route | Angular route | Behaviors to match |
|---|---|---|
| `/` (root) | `/` | Redirects to `/dashboard` without flash |
| `/login` | `/login` | Email + password fields visible; submit with valid credentials redirects to `/dashboard`; invalid credentials shows error toast; "Remember me" checkbox present; dark-mode styling applied |
| `/login` (2FA) | `/login` | If 2FA is enabled, a TOTP input appears after password step |
| `/register` | `/register` | Registration form renders; submit creates account and redirects to `/login` or `/dashboard` |
| `/dashboard` | `/dashboard` | Device count KPI cards visible; device list table with status badges; online/offline counts correct; search field filters devices; status filter dropdown works |
| `/devices` | `/devices` | Same as `/dashboard` device list section — or redirects to `/dashboard` |
| `/devices/add` | `/dashboard` → Register button | Register Device bottom sheet opens; form accepts hostname + device type + API key; submit creates device; device appears in list |
| `/devices/:id` | `/devices/:id` | Redirects to `/devices/:id` overview tab without flash |
| `/devices/:id` (overview) | `/devices/:id` (overview tab) | Device name, status badge, IP, OS, uptime visible; metric cards (CPU, RAM, disk) show live values |
| `/devices/:id/alerts` | `/devices/:id/alerts` | Alert list loads; each alert shows severity badge, message, timestamp; acknowledged/resolved filters work |
| `/devices/:id/commands` | `/devices/:id/commands` | Command history table loads; "Run Command" button opens command sheet; running a command shows output |
| `/devices/:id/logs` | `/devices/:id/logs` | Log entries load; date range picker filters; severity filter works; log text is readable |
| `/devices/:id/metrics` | `/devices/:id/metrics` | Period selector (1h/6h/24h/7d) present; 4 ECharts line charts render (CPU, RAM, disk, network) with data; no empty chart areas |
| `/devices/:id/network` | `/devices/:id/network` | Network interfaces listed; IP addresses, MAC, RX/TX stats visible |
| `/devices/:id/storage` | `/devices/:id/storage` | Disk partitions listed; used/total/percent for each; progress indicators visible |
| `/devices/:id/settings` | `/devices/:id/settings` | General, Monitoring, Network, Agent, Security sections present; editing device name saves; threshold sliders work; API key reveal works |
| `/devices/:id/terminal` | `/devices/:id/terminal` | If device ONLINE: command input present; submit sends command and displays output. If device OFFLINE: "Device Offline" message shown, no input rendered |
| `/settings` | `/settings` | Redirects to `/settings/profile` |
| `/settings/profile` | `/settings/profile` | Username, email fields pre-filled with current user; save changes updates profile |
| `/settings/security` | `/settings/security` | Change password form present; API keys table loads; "Create API Key" creates a new key; delete key removes it; 2FA enable/disable present |
| `/settings/system` | `/settings/system` | Theme selector (light/dark/system) present and working; notification settings visible |
| `/settings/notifications` | `/settings/notifications` | Notification preferences form loads; toggling saves preferences |
| `/admin` | `/admin` | Admin overview page: stats cards (users, devices, alerts, active devices) load |
| `/admin/devices` | `/admin/devices` | Cross-tenant device table loads (SUPERADMIN only); status filter and search work |
| `/admin/users` | `/admin/users` | User list table loads; role badges visible; "New User" button opens modal (not new route) |
| `/admin/users/new` | `/admin/users` → New User modal | New user form opens as IonModal (not a separate page); submitting creates user and closes modal |
| `/admin/logs` | `/admin/logs` | System log table loads; date range, severity, search filters work; CSV export produces a file |
| `/admin/system` | `/admin/system` | System stats (memory, CPU, uptime, disk) with progress bars load; refresh works |

### Routes present in Angular but NOT in legacy (no parity needed)

| Angular route | Status | Notes |
|---|---|---|
| `/monitoring` | Implemented (not placeholder) | No legacy equivalent page; behavioral parity N/A |
| `/logs` | Placeholder page | No legacy equivalent; not in scope for this migration |

### Routes present in legacy but NOT routed in Angular (confirm handled)

| Legacy concern | Resolution |
|---|---|
| `middleware.ts` auth redirect | Angular `authGuard` in `core/auth/guards` handles unauthenticated redirect to `/login` |
| `apps/frontend/src/app/api/[...path]/route.ts` (catch-all proxy) | Replaced by `proxy.conf.json` (dev) + Traefik `/api/*` routing to Express backend (prod) |
| `GET /api/health` returning `"service":"iotpilot-frontend"` | Express backend owns `GET /api/health`; nginx does not proxy API. Field `service` will differ — acceptable. |

---

## Manual parity steps (cannot be automated in `make ng-parity`)

These steps must be performed by a developer during T3 and T4 QA:

1. **Login with valid credentials** — confirm JWT is stored in memory (not localStorage), cookie is set, redirect to `/dashboard` works.
2. **Login with invalid credentials** — confirm error toast appears, no redirect.
3. **Session expiry** — let token expire (or DELETE session row in DB) and reload; confirm redirect to `/login`.
4. **Register new user** — complete registration, confirm redirect.
5. **SSH terminal (device must be ONLINE)** — enter a shell command, confirm output appears within a few seconds.
6. **SSH terminal (device OFFLINE)** — confirm "Device Offline" empty state, no input rendered.
7. **Run a device command** — open command sheet, run `echo hello`, confirm output row appears in history.
8. **Register a new device** — complete RegisterDeviceSheet, confirm device appears in list.
9. **API key create/reveal/delete** (settings → security) — create a key, reveal it once, delete it.
10. **Theme toggle** — switch dark ↔ light, reload; confirm theme persists via `GET /settings`.
11. **Admin: create new user** — open AdminNewUserModal, submit, confirm user appears in table.
12. **Admin: logs CSV export** — apply a filter, click export, confirm file downloads.

---

## Exit checklist (module → done)

- [ ] T1 merged and CI green
- [ ] T2 merged — `make ng-parity` target exists and passes
- [ ] T3 merged — parity QA log in PR, all checklist rows passed
- [ ] T4 merged — local hostname switched to Angular, backend unaffected
- [ ] T5 merged — staging deploy confirmed
- [ ] T6 complete — 24 h prod monitoring green, `iotpilot-app` block removed
- [ ] T7 merged — `apps/frontend` removed, CI still green
- [ ] T8 evaluated — decision documented in fe-foundation Q6 (either merged or closed)
- [ ] README `fe-cutover` row flipped to `✅ done` (in T7)
- [ ] All open questions `_resolved_`
- [ ] fe-mobile can now deepen and execute (its only remaining upstream dependency was fe-cutover confirming the canonical Angular app)
