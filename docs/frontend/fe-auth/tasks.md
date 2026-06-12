# fe-auth — Tasks

Each task is one small PR ≤ 1 dev-day. T1 must land before T2–T5. T4 and T5 are
independent of each other and can be done in parallel. T5 is blocked until Q1 is resolved.

## Status

| # | Task | Status |
|---|---|---|
| T1 | Auth feature scaffold + route wiring + `loggedInGuard` | done |
| T2 | Login page — credentials step | done |
| T3 | Login page — 2FA inline step | done |
| T4 | `PasswordStrength` component (auth-private) | done |
| T5 | Register page | done |

---

### T1 — Auth feature scaffold + route wiring + `loggedInGuard`

- **Does:**
  1. Creates `apps/frontend-ng/src/app/features/auth/` directory tree (pages/ + components/).
  2. Adds `loggedInGuard` to `apps/frontend-ng/src/app/core/auth/guards.ts`: if the user
     `isAuthenticated()`, redirect to `/app`; otherwise allow (prevents logged-in users
     from visiting `/login` or `/register`).
  3. Wires `/login` and `/register` lazy routes in `app.routes.ts`, both guarded by
     `loggedInGuard`. Placeholder components are acceptable at this stage.
  4. Changes the root `''` redirect from `'home'` to `'login'` (the `/home` dev page
     stays accessible at `/home` for now; the root of the production app should be
     `/login` for unauthenticated users and the guard redirects authenticated users to
     `/app`).
  5. Adds a `beforeEnter`-style navigation from `/` → determined by auth state:
     if authenticated → `/app`, else → `/login`. Implement as a functional guard on the
     root redirect or a dedicated redirect route.
  6. Adds unit tests for `loggedInGuard` (authenticated → redirect to /app; unauthenticated → allow).

- **Output:**
  - `core/auth/guards.ts` exports `loggedInGuard` alongside `authGuard` and `roleGuard`.
  - `app.routes.ts` has routes for `/login`, `/register` (lazy), and a smart root redirect.
  - `/fe-check` passes (lint + type-check + tests).

- **Invariant:** no UI code in this task; placeholder components may be minimal
  empty `IonPage` shells.

---

### T2 — Login page — credentials step

- **Does:**
  1. Implements `features/auth/pages/login/login.page.ts` as a standalone Angular
     component with an Ionic page layout.
  2. Reactive form with three controls: `email` (Validators.required + Validators.email),
     `password` (Validators.required), `remember` (boolean, default false).
  3. Submit calls `AuthService.login()`:
     - On `{ status: 'authenticated' }`: reads `ActivatedRoute.snapshot.queryParams.returnUrl`,
       navigates to `returnUrl || '/app'`.
     - On `{ status: 'requires-2fa' }`: stores `{ userId }` in component state — 2FA step
       handled in T3 (for now, show a placeholder toast "2FA required — coming in T3").
     - On error: shows an inline error message (no external toast library; use an Ionic
       `ion-text color="danger"` below the submit button).
  4. Submit button shows a spinner while the call is in flight (use `AuthService`'s or a
     local `isLoading` signal).
  5. Password field has a show/hide toggle via a button in the input's `end` slot.
  6. Layout: full-page `ion-content` with a centered card (max-width: 420px). Logo/app-name
     above the card. Link to `/register` below the form.
  7. Unit test: form validation (empty submit blocked), successful login navigates to
     `/app`, failed login shows error message.

- **Output:**
  - `login.page.ts`, `login.page.html`, `login.page.scss`, `login.page.spec.ts`.
  - `loggedInGuard` on `/login` route ensures authenticated users are redirected away.
  - `/fe-check` passes.

- **Parity:** mirrors `components/login-page.tsx` + `components/login-form.tsx`.

---

### T3 — Login page — 2FA inline step

- **Does:**
  1. Extends `login.page.ts` with a `step` signal: `'credentials' | '2fa'`.
  2. When `AuthService.login()` returns `{ status: 'requires-2fa', userId }`:
     - Sets `step` to `'2fa'` and stores `userId` in the component.
     - Shows a toast: "Verification code sent to your email".
  3. 2FA view (inside the same page component, conditionally rendered via `@if`):
     - Single 6-digit code `IonInput` (`type="number"`, `inputmode="numeric"`, `maxlength=6`).
     - Auto-focuses the input when the step becomes `'2fa'` (via `ViewChild` + `setFocus()`).
     - Submit calls `AuthService.verifyTwoFactor(userId, code, remember)` → on success,
       navigates to `returnUrl || '/app'`.
     - "Back to login" button: sets `step` back to `'credentials'`, clears code.
     - On error: clears code, re-focuses input, shows inline error.
  4. Unit tests: 2FA step renders when login returns `requires-2fa`; back button resets to
     credentials; verifyTwoFactor error clears code; success navigates.

- **Output:**
  - `login.page.ts/html/spec.ts` updated. No new files.
  - `/fe-check` passes.

- **Parity:** mirrors `app/login/TwoFactorForm.tsx`.

---

### T4 — `PasswordStrength` component (auth-private)

- **Does:**
  1. Creates `features/auth/components/password-strength/password-strength.component.ts`
     as a standalone Angular component.
  2. Input: `password` signal input (`input<string>('')`).
  3. Derives a `rules` computed signal — array of `{ label: string; valid: boolean }` for
     the five rules from the legacy app (and matching the OpenAPI `minLength: 12`):
     - At least 12 characters
     - One uppercase letter
     - One lowercase letter
     - One number
     - One special character (`!@#$%^&*()_+-=[]{}...`)
  4. Template: renders nothing when password is empty (parity with legacy `if (!password) return null`).
     Otherwise renders a list with a ✓ (success color) or ✗ (danger color) icon per rule
     and the label text. Use Ionic `IonIcon` from `shared/ui`.
  5. Unit tests: empty password → no list rendered; partial password → mixed valid/invalid;
     fully valid password → all green.

- **Output:**
  - `password-strength.component.ts`, `.html`, `.scss`, `.spec.ts`.
  - No changes to `shared/ui` barrel (auth-private component, not kit-level).
  - `/fe-check` passes.

- **Note:** this component is consumed by T5 (register page). It can be merged before T5
  if T5 is blocked by Q1.

---

### T5 — Register page

- **Does:**
  1. Fixes the OpenAPI spec gap first (see Q1): add a 201 response schema for
     `POST /auth/register` in `docs/openapi.yml`:
     ```yaml
     '201':
       content:
         application/json:
           schema:
             $ref: '#/components/schemas/RegisterResponse'
     ```
     Add `RegisterResponse` schema with `{ message: string, requiresApproval: boolean, user: … }`.
     Regenerate the client (`make ng-api-gen`). No other code changes needed from the regen.
  2. Implements `features/auth/pages/register/register.page.ts` as standalone Ionic page.
  3. Reactive form with four controls: `username` (required, minLength 3), `email`
     (required, email), `password` (required, minLength 12), `confirmPassword` (required).
     Custom cross-field validator: `confirmPassword` must match `password`.
  4. Renders `<app-password-strength [password]="form.value.password ?? ''" />` below the
     password field (from T4).
  5. Submit calls `api.invoke(register, { body: { username, email, password } })`:
     - If `res.requiresApproval`: toast "Registration submitted. An administrator will
       review your account." → navigate to `/login`.
     - If not: toast "Account created successfully. You can now log in." → navigate to
       `/login`.
     - On HTTP 409: inline error "An account with this email already exists."
     - Other errors: generic inline error.
  6. Password field has show/hide toggle. Confirm password field has show/hide toggle.
  7. Layout: same centered-card pattern as login page. Link back to `/login`.
  8. Unit tests: validation (all required fields), 409 error shown inline, requiresApproval
     navigates to /login with correct toast, normal registration navigates to /login.

- **Output:**
  - `docs/openapi.yml` updated + client regenerated.
  - `register.page.ts`, `register.page.html`, `register.page.scss`, `register.page.spec.ts`.
  - `/fe-check` passes.

- **Parity:** mirrors `components/register-page.tsx` + `components/registration-form.tsx`.

- **BLOCKED BY:** Q1 (spec gap) — cannot distinguish approval flows without the response body.
