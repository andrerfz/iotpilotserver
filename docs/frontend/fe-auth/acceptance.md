# fe-auth — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `loggedInGuard` tests pass; navigating to `/login` while authenticated redirects to `/app`; `/` for unauthenticated → `/login`; `/fe-check` green |
| T2 | Login form with valid credentials navigates to `/app`; invalid credentials show inline error (no alert/toast); form blocked when fields empty; `/fe-check` green |
| T3 | Login with a 2FA-enabled account shows code input; 6-digit entry + submit completes login and navigates to `/app`; back button returns to credentials step; wrong code clears input and shows error; `/fe-check` green |
| T4 | `PasswordStrength` shows nothing when password is empty; shows 5 rules with correct ✓/✗ as chars are typed; all 5 green for a fully valid password; `/fe-check` green |
| T5 | Register form with all valid fields submits; `requiresApproval=true` shows "administrator will review" toast and lands on `/login`; `requiresApproval=false` shows "account created" toast and lands on `/login`; 409 shows inline "email already exists" error; `/fe-check` green |

## Module-level scenarios

```gherkin
Feature: User authentication

  Background:
    Given the backend is running with seeded data
    And there is a USER account "user@example.com" / "ValidPass1!" (no 2FA)
    And there is a USER account "user2fa@example.com" / "ValidPass1!" with 2FA enabled

  Scenario: Successful login redirects to app shell
    Given I am on "/login"
    When I fill in email "user@example.com" and password "ValidPass1!"
    And I click "Sign in"
    Then I am redirected to "/app/dashboard"
    And the app shell is visible (rail + topbar)

  Scenario: Failed login shows inline error
    Given I am on "/login"
    When I fill in email "user@example.com" and password "WrongPassword1!"
    And I click "Sign in"
    Then I see an inline error message containing "Invalid"
    And I remain on "/login"

  Scenario: 2FA login flow
    Given I am on "/login"
    When I fill in email "user2fa@example.com" and password "ValidPass1!"
    And I click "Sign in"
    Then the 2FA code input is shown and focused
    When I enter the valid 6-digit code
    And I click "Verify"
    Then I am redirected to "/app/dashboard"

  Scenario: 2FA back button resets to credentials
    Given I am on "/login" and have triggered the 2FA step
    When I click "Back to login"
    Then the credentials form is shown again
    And the code field is cleared

  Scenario: Authenticated user is redirected away from /login
    Given I am authenticated as "user@example.com"
    When I navigate to "/login"
    Then I am redirected to "/app/dashboard"

  Scenario: Unauthenticated user reaching root is redirected to /login
    Given I am not authenticated
    When I navigate to "/"
    Then I am redirected to "/login"

  Scenario: returnUrl is honoured after login
    Given I am not authenticated
    When I navigate to "/app/devices"
    Then I am redirected to "/login?returnUrl=%2Fapp%2Fdevices"
    When I log in successfully
    Then I am redirected to "/app/devices"

  Scenario: New user registration (first on email domain — auto-approved)
    Given I am on "/register"
    And no user with "newdomain.io" exists yet
    When I fill in username "alice", email "alice@newdomain.io", password "ValidPass12!", confirm "ValidPass12!"
    And I click "Create account"
    Then I see a success toast "Account created successfully"
    And I am on "/login"

  Scenario: New user registration (existing domain — requires approval)
    Given I am on "/register"
    And a customer for "example.com" already exists
    When I fill in username "bob", email "bob@example.com", password "ValidPass12!", confirm "ValidPass12!"
    And I click "Create account"
    Then I see a toast containing "administrator will review"
    And I am on "/login"

  Scenario: Registration with duplicate email shows inline error
    Given I am on "/register"
    And "user@example.com" is already registered
    When I fill in email "user@example.com" and a valid password and username
    And I click "Create account"
    Then I see an inline error "An account with this email already exists"
    And I remain on "/register"

  Scenario: Password strength component guides password creation
    Given I am on "/register"
    When I type "short" in the password field
    Then 4 rules are marked invalid (length, uppercase, lowercase pass for some chars)
    When I type "ValidPassword12!" in the password field
    Then all 5 password rules are marked valid
```

## Parity checklist

| Legacy behavior | Verified by |
|---|---|
| Login form shows email, password, remember-me | T2 test + visual |
| Incorrect password → inline error, no toast | T2 test |
| 2FA: toast "Verification code sent to your email" | T3 test |
| 2FA: code input numeric, 6-char limit, auto-focus | T3 test |
| 2FA: back button → credentials form | T3 test |
| 2FA: wrong code clears input | T3 test |
| After login → navigate to `/` (legacy) → `/app` (new) | T2 test |
| Register: 4 fields (username, email, password, confirm) | T5 test |
| Register: passwords don't match → blocked / error | T5 test |
| Register: pending approval → toast + /login | T5 test |
| Register: auto-approved → toast + /login | T5 test |
| Password requirements: 5 rules, live update | T4 test |
| Show/hide toggle on password fields | T2/T5 manual |

## Exit checklist (module → done)

- [ ] T1–T5 all merged and `/fe-check` green
- [ ] `docs/frontend/README.md` module row updated to `done`
- [ ] All open questions `_resolved_`
- [ ] Gherkin scenarios above all pass against the running local backend
- [ ] The following modules can now be deepened: **fe-settings** (requires auth context — all pages are behind `authGuard`)
