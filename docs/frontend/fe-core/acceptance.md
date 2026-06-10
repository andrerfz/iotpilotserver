# fe-core — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | Client compiles strict; CI fails on stale generated code; spot-check 3 endpoints' types against `docs/openapi.yml` |
| T2 | TokenStorage unit tests pass for both platform strategies; ApiError maps a real backend 400/401/403 payload |
| T3 | Against local backend: login with seeded user populates signals; restart (page reload) restores session |
| T4 | Expired-token request transparently refreshes and succeeds; failed refresh lands on `/login` with session cleared |
| T5 | Role matrix test: every role × route class resolves to the same allow/redirect as legacy `middleware.ts` |
| T6 | 2FA flow completes against backend with a seeded 2FA user; session list/revoke round-trips |
| T7 | Socket connects after login, receives a manually created alert (POST /monitoring/alerts), disconnects on logout |
| T8 | Example query handler returns data through the bus with loading/error signals behaving correctly |
| T9 | An ApiError surfaces as a toast with the mapped message, not the raw payload |

## Module-level scenarios

```gherkin
Feature: frontend-ng core layer

  Scenario: Full auth round trip
    Given the backend has a seeded ADMIN user
    When AuthService.login is called with valid credentials
    Then currentUser and role signals are populated
    And a subsequent generated-client call succeeds with the bearer token attached

  Scenario: Tenant-scoped real-time alert
    Given an authenticated session with an active socket
    When an alert is created for the user's tenant via the API
    Then the alerts stream emits it
    And no alert from another tenant is ever emitted

  Scenario: Role protection parity with legacy middleware
    Given a USER-role session
    When navigating to an ADMIN-only route
    Then the guard redirects exactly as the legacy Next.js middleware does
```

## Exit checklist (module → done)

- [ ] All 9 tasks merged and green in CI
- [ ] No hand-written HTTP call outside `core/api/generated`
- [ ] README module table updated to `done`
- [ ] Open questions all `_resolved_`
- [ ] `/fe-deepen fe-ui-kit` and `/fe-deepen fe-auth` can run (their inputs — buses, guards, toast — are final)
