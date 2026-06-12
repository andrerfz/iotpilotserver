# fe-settings — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `/settings` redirects to `/settings/profile`; hub nav renders 4 items with correct `routerLink`; unauthenticated request to any `/settings/*` route redirects to `/login?returnUrl=…`; `/fe-check` passes |
| T2 | `GET /settings/profile` response patches both forms; read-only `email`/`username` shown, not editable; personal save sends full merged payload (personal + current display values); display save sends full merged payload (display + current personal values); `/fe-check` passes |
| T3 | `GET /settings/notifications` response patches toggles (string `'true'`/`'false'` → boolean); save button sends string-converted payload; error shows inline; `/fe-check` passes |
| T4a | Security settings form patches from GET; slider and numeric input stay in sync; save sends string-converted payload; change-password cross-field validator blocks mismatch; `wasCurrentSession` logout + redirect to `/login` works; wrong current password shows inline 400 error; `/fe-check` passes |
| T4b | Sessions list loads on toggle; individual revoke removes item from local list without reload; "revoke all" shows `revokedCount` message and reloads list; 2FA-off recommendation visible when 2FA disabled; 2FA-on recommendation hidden when 2FA enabled; `/fe-check` passes |
| T5 | Display section renders for all users; admin section hidden for `isAdmin === 'false'`; admin section visible for `isAdmin === 'true'`; theme change calls `ThemeService.setTheme()` (not `api.invoke` directly); display save excludes theme field; `/fe-check` passes |

---

## Module-level scenarios

```gherkin
Feature: Settings hub navigation
  Background:
    Given the user is authenticated and at "/settings"

  Scenario: Hub redirects to profile
    Then the URL becomes "/settings/profile"
    And the Profile nav item is highlighted as active

  Scenario: Navigate between settings sections
    When the user clicks "Security" in the settings nav
    Then the URL becomes "/settings/security"
    And the Security nav item is highlighted as active

  Scenario: Unauthenticated access is blocked
    Given the user is NOT authenticated
    When the user navigates to "/settings/notifications"
    Then the URL becomes "/login?returnUrl=%2Fsettings%2Fnotifications"

Feature: Profile settings
  Background:
    Given the API returns profile data with email "user@example.com" and firstName "Alice"
    And the user is on "/settings/profile"

  Scenario: Read-only fields are not editable
    Then an input for "email" is not present (only a display element)
    And an input for "username" is not present

  Scenario: Personal info save merges with display prefs
    When the user sets firstName to "Bob" and clicks "Save personal info"
    Then PUT /settings/profile is called with the body containing firstName "Bob"
    And the body also contains the current language, timezone, and dateFormat values

  Scenario: Display prefs save merges with personal info
    When the user changes language to "es" and clicks "Save display preferences"
    Then PUT /settings/profile is called with language "es"
    And the body also contains the current firstName, lastName, and phoneNumber values

Feature: Notifications settings
  Background:
    Given the API returns notifications with emailNotifications "true", pushNotifications "false"
    And the user is on "/settings/notifications"

  Scenario: Toggles patch from API string values
    Then the emailNotifications toggle is ON
    And the pushNotifications toggle is OFF

  Scenario: Save converts booleans to strings
    When the user turns OFF emailNotifications and clicks "Save"
    Then PUT /settings/notifications is called with emailNotifications "false"

Feature: Security settings — form and password
  Background:
    Given the API returns security settings with twoFactorAuth "false", sessionTimeout 30
    And the user is on "/settings/security"

  Scenario: Session timeout controls stay in sync
    When the user drags the timeout slider to 60
    Then the numeric input shows 60
    When the user types 120 in the numeric input
    Then the slider moves to 120

  Scenario: Change password — mismatch blocked
    When the user fills currentPassword "old", newPassword "NewPass12!", confirmPassword "Different!"
    And clicks "Change password"
    Then PUT /auth/password is NOT called
    And an inline validation error is shown

  Scenario: Change password — wrong current password
    Given PUT /auth/password returns 401
    When the user submits valid change-password data
    Then an inline error is shown
    And the user remains on the security page

  Scenario: Change password — current session invalidated
    Given PUT /auth/password returns wasCurrentSession true
    When the user submits valid change-password data
    Then the user is logged out and redirected to "/login"

Feature: Security settings — sessions
  Background:
    Given the user is on "/settings/security"
    And GET /auth/sessions returns 3 sessions (1 current)

  Scenario: Sessions load on expand
    When the user clicks "Manage active sessions"
    Then GET /auth/sessions is called
    And 3 session items are shown

  Scenario: Revoke individual session
    When the user clicks "Revoke" on a non-current session
    Then DELETE /auth/sessions/{id} is called
    And that session item is removed from the list without a full reload

  Scenario: Revoke all other sessions
    When the user clicks "Revoke all other sessions"
    Then DELETE /auth/sessions is called
    And the inline message shows the revokedCount from the response
    And the sessions list reloads

Feature: System settings
  Background:
    Given the user is on "/settings/system"

  Scenario: Admin section hidden for regular user
    Given GET /settings/system returns isAdmin "false"
    Then the admin section is not visible

  Scenario: Admin section visible for admin user
    Given GET /settings/system returns isAdmin "true"
    Then the admin section is visible

  Scenario: Theme change goes through ThemeService
    When the user selects "dark" in the theme segment
    Then ThemeService.setTheme("dark") is called
    And PUT /settings/system is NOT called directly by the page

  Scenario: Display save excludes theme
    When the user changes dashboardLayout to "compact" and clicks Save
    Then PUT /settings/system is called
    And the request body does NOT contain a "theme" field
```

---

## Parity checklist

| Legacy page | Behaviors to match |
|---|---|
| `settings/layout.tsx` | 4 nav items (Profile, Notifications, Security, System); active-link highlight; layout wraps all child pages |
| `settings/profile/ProfileSettingsClient.tsx` | Two independent forms on one page; read-only email + username; dual-form PUT merge (save personal → include display prefs, and vice versa); per-form loading + error state |
| `settings/notifications/page.tsx` | 4 toggles; string `'true'`/`'false'` ↔ boolean conversion; explicit Save button (not auto-save on toggle); inline error |
| `settings/security/page.tsx` — Cards 1–2 | 2FA toggle; slider + numeric input in sync (clamp to 1440); login notifications toggle; change-password 3-field form; minLength 8 validation; `wasCurrentSession` logout redirect; show/hide toggles on all 3 password fields |
| `settings/security/page.tsx` — Cards 3–4 | Sessions panel expand/collapse; session list with isCurrent label; per-session revoke (local list update); revoke-all with count message; static recommendations driven by 2FA state and session count |
| `settings/system/page.tsx` — Display | `theme` 3-option selector (light/dark/system); `dashboardLayout` select; `itemsPerPage` select; UI reflects currently active theme |
| `settings/system/page.tsx` — Admin | Section gated on `isAdmin === 'true'`; `enableAdvancedMetrics` toggle; `enableBetaFeatures` toggle; `logLevel` select; separate save for admin fields |

---

## Exit checklist (module → done)

- [ ] All tasks (T1–T5) merged and green in CI
- [ ] `docs/frontend/README.md` fe-settings row updated to `✅ done`
- [ ] All open questions `_resolved_` (Q1 already resolved; no `_pending_` questions)
- [ ] `/fe-check` passing on the final merged state
- [ ] Downstream modules that can now proceed: none blocked by fe-settings (fe-dashboard
      and fe-admin depend only on fe-ui-kit; fe-settings has no downstream gates)
