# fe-settings — Tasks

Each task is one small PR ≤ 1 dev-day. T1 must land before T2–T5. T2, T3, T4a, and T5
are independent of each other and can be done in parallel once T1 merges. T4b requires
T4a to be merged first (it extends the security page).

## Status

| # | Task | Status |
|---|---|---|
| T1 | Settings feature scaffold + hub page + routes + authGuard wiring | done |
| T2 | Profile page (personal info + display prefs, dual-form) | done |
| T3 | Notifications page (4 toggles) | done |
| T4a | Security page — settings form + change password | done |
| T4b | Security page — active sessions panel + recommendations | done |
| T5 | System page (display settings + admin section) | done |

---

### T1 — Settings feature scaffold + hub page + routes + authGuard wiring

- **Does:**
  1. Creates `apps/frontend-ng/src/app/features/settings/` directory tree: `pages/hub/`,
     `pages/profile/`, `pages/notifications/`, `pages/security/`, `pages/system/`, and
     `settings.routes.ts`.
  2. Implements `SettingsHubPage` as a standalone Ionic page component. The hub page
     renders an `ion-list` sidebar with 4 navigation items: Profile, Notifications,
     Security, System — each an `ion-item` + `ion-label` + `routerLink`. Active-link
     highlight via `routerLinkActive="active"` (replaces the legacy `usePathname()`
     comparison). On narrow viewports the list is shown inline above the outlet; on desktop
     the split-pane shell (`ion-split-pane`) already handles the nav rail.
  3. Each non-hub settings page gets a placeholder component (`IonPage` + `IonContent`
     with a single `<h2>` heading — e.g. "Profile settings coming soon"). Placeholders are
     replaced by T2–T5.
  4. Adds `settings.routes.ts` with child routes:
     - `''` → redirect to `profile`
     - `profile` → `SettingsProfilePage` (lazy)
     - `notifications` → `SettingsNotificationsPage` (lazy)
     - `security` → `SettingsSecurityPage` (lazy)
     - `system` → `SettingsSystemPage` (lazy)
     All child routes guarded by `authGuard` (or the parent route carries the guard —
     either is acceptable; apply at the parent `/settings` route for DRY).
  5. Registers the settings feature in `app.routes.ts` at path `/settings`, lazy-loading
     `settings.routes.ts`.
  6. Unit tests for `SettingsHubPage`: nav items render with correct `routerLink` values;
     `authGuard` test (not authenticated → redirect to `/login` with `returnUrl`).

- **Output:**
  - `settings.routes.ts` with 5 child routes.
  - `settings-hub.page.ts/html/scss/spec.ts`.
  - `app.routes.ts` updated with `/settings` lazy route.
  - `core/auth/guards.ts` — `authGuard` already exists (fe-auth T1); no changes needed
    unless the guard was implemented as a path-only guard and needs to pass `state.url`
    for the `returnUrl` param — verify and patch if needed.
  - `/fe-check` passes.

- **Invariant:** no real API calls in this task; placeholder pages may render static
  content only.

---

### T2 — Profile page (personal info + display prefs, dual-form)

- **Does:**
  1. Implements `SettingsProfilePage` replacing the placeholder from T1.
  2. On `ngOnInit`, calls `GET /settings/profile` via `api.invoke(getProfileSettings, {})`.
     Stores the response in a `profileData` signal. Read-only fields (`email`, `username`)
     are displayed from this signal, not in form controls.
  3. **Personal info form** (`FormBuilder.nonNullable.group()`):
     - `firstName`: optional, max 100 chars.
     - `lastName`: optional, max 100 chars.
     - `phoneNumber`: optional, max 20 chars.
     Patched from `profileData` on load. `onSavePersonal()`: merges with current
     display prefs values (`displayForm.getRawValue()`) and calls
     `PUT /settings/profile` with the full merged object. This matches the legacy
     behavior where both sections PUT the complete profile payload on every save.
  4. **Display prefs form** (`FormBuilder.nonNullable.group()`):
     - `language`: select, options `['en','es','fr','de','zh']`, default `'en'`.
     - `timezone`: select, options `['UTC','America/New_York','America/Chicago',
       'America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo']`.
     - `dateFormat`: select, options `['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD']`.
     Each select uses `UiSelectComponent` from `shared/ui`. Patched from `profileData`
     on load. `onSaveDisplay()`: merges with current personal form values and calls
     `PUT /settings/profile` with the full merged object.
  5. Each form has its own `isSaving` signal and `errorMessage` signal for inline
     feedback. Success shows an inline success message (no external toast).
  6. Unit tests: form patches correctly from GET response; personal save sends merged
     payload including display prefs; display save sends merged payload including personal
     values; read-only fields visible but not editable.

- **Output:**
  - `settings-profile.page.ts/html/scss/spec.ts` (replaces placeholder from T1).
  - `/fe-check` passes.

- **Parity:** mirrors `app/settings/profile/ProfileSettingsClient.tsx` (284 lines).

---

### T3 — Notifications page (4 toggles)

- **Does:**
  1. Implements `SettingsNotificationsPage` replacing the placeholder from T1.
  2. On `ngOnInit`, calls `GET /settings/notifications` via `api.invoke`. Patches a
     single `FormBuilder.nonNullable.group()` form from the response.
  3. Four toggle controls using `IonToggle` from `shared/ui`:
     - `emailNotifications`
     - `pushNotifications`
     - `alertNotifications`
     - `deviceOfflineNotifications`
     The API stores and returns these as the string `'true'` or `'false'`. The form works
     with native booleans; a `transform` step converts between `string ↔ boolean` on
     load and on save (e.g. `value === 'true'` for load, `String(value)` for save). This
     mirrors the legacy `formData.get(key) === 'true'` pattern.
  4. On `valueChanges` debounced (300ms) OR an explicit save button: calls
     `PUT /settings/notifications` with the string-converted payload. Legacy uses an
     explicit save button — match that: one "Save" button at the bottom of the form.
  5. `isSaving` and `errorMessage` signals for inline feedback.
  6. Unit tests: toggles patch to boolean from string API response; save button sends
     string-converted payload; error state shows inline message.

- **Output:**
  - `settings-notifications.page.ts/html/scss/spec.ts` (replaces placeholder from T1).
  - `/fe-check` passes.

- **Parity:** mirrors `app/settings/notifications/page.tsx` (191 lines).

---

### T4a — Security page: settings form + change password

- **Does:**
  1. Implements `SettingsSecurityPage` replacing the placeholder from T1. This task covers
     the first two cards; T4b adds the third and fourth.
  2. On `ngOnInit`, calls `GET /settings/security` via `api.invoke`. Patches the security
     form. The API stores booleans as string `'true'`/`'false'` — same transform as T3.
  3. **Security settings form** (`FormBuilder.nonNullable.group()`):
     - `twoFactorAuth`: `IonToggle`. String `'true'`/`'false'` in API.
     - `sessionTimeout`: slider (`IonRange`, min=5, max=240, step=5) + numeric `IonInput`
       (max value 1440). The two controls are kept in sync via `valueChanges` — updating
       the slider updates the input and vice versa. Legacy clamps input to 1440 on blur.
     - `loginNotifications`: `IonToggle`. String `'true'`/`'false'` in API.
     `onSaveSecurity()`: calls `PUT /settings/security` with string-converted payload.
  4. **Change password form** (`FormBuilder.nonNullable.group()`):
     - `currentPassword`: required.
     - `newPassword`: required, minLength 8.
     - `confirmPassword`: required. Cross-field validator: must equal `newPassword`.
     `onChangePassword()`: calls `PUT /auth/password` with `{ currentPassword, newPassword }`.
     - On success: clears the form; shows inline success message. If the response
       indicates `wasCurrentSession === true`, calls `AuthService.logout()` then navigates
       to `/login` (the session was the one being used).
     - On 400/401: shows inline error (wrong current password).
     - On other errors: shows generic inline error.
     All password fields have show/hide toggles (local `show*` signals + button in input
     `end` slot — same pattern as fe-auth T2 Q4).
  5. Unit tests: security form patches from GET; `sessionTimeout` slider and input stay
     in sync; save calls PUT with string-converted payload; change password cross-field
     validator blocks mismatched; `wasCurrentSession` triggers logout + redirect; wrong
     current password shows inline error.

- **Output:**
  - `settings-security.page.ts/html/scss/spec.ts` (replaces placeholder from T1).
  - `/fe-check` passes.

- **Parity:** Cards 1–2 of `app/settings/security/page.tsx` (473 lines total → split).

---

### T4b — Security page: active sessions panel + recommendations

- **Does:**
  1. Extends the `SettingsSecurityPage` from T4a — adds content to the existing
     component and template. No new files beyond updates.
  2. **Active sessions panel** (Card 3):
     - A `showSessions` signal (default `false`). Clicking "Manage active sessions"
       button flips it. When `true`, calls `GET /auth/sessions` via `api.invoke` and
       stores results in a `sessions` signal. Session shape: `{ id, createdAt, expiresAt, isCurrent }`.
     - Renders an `ion-list` of sessions. Each item shows: creation date, expiry date,
       "(current)" label if `isCurrent`. Each non-current session has a "Revoke" button
       calling `DELETE /auth/sessions/{id}`. After revocation, removes the session from
       the local `sessions` signal (no full reload).
     - "Revoke all other sessions" button calls `DELETE /auth/sessions`. On success,
       shows inline message "Revoked N other sessions" using the `revokedCount` from the
       response, then reloads the sessions list.
     - `isLoadingSessions` and `sessionError` signals for the list state.
  3. **Security recommendations** (Card 4 — static):
     Renders 3 recommendation items driven by current component state:
     - "Enable two-factor authentication" — shown with a warning icon when
       `securityForm.get('twoFactorAuth').value !== 'true'`.
     - "Review active sessions" — shown with an info icon when `sessions().length > 1`
       (after sessions are loaded) or when sessions have not been loaded yet.
     - "Use a strong, unique password" — always shown as a static tip.
  4. Unit tests: toggling sessions loads the list; revoking individual removes item from
     list; revoking all shows count message and reloads; recommendations reflect state
     (2FA off → warning item visible; 2FA on → warning item hidden).

- **Output:**
  - `settings-security.page.ts/html/spec.ts` updated (T4a files extended).
  - `/fe-check` passes.

- **Parity:** Cards 3–4 of `app/settings/security/page.tsx`.

---

### T5 — System page (display settings + admin section)

- **Does:**
  1. Implements `SettingsSystemPage` replacing the placeholder from T1.
  2. On `ngOnInit`, calls `GET /settings/system` via `api.invoke`. Response includes an
     `isAdmin` field (string `'true'`/`'false'`). Stores response in a `systemData`
     signal; derives `isAdmin = computed(() => systemData()?.isAdmin === 'true')`.
  3. **Display settings section** (all users):
     - `theme`: `IonSegment` + 3 `IonSegmentButton` items: `light`, `dark`, `system`.
       On change: calls `ThemeService.setTheme(value)` — the service handles the
       `PUT /settings/system` persistence internally. Do NOT call `api.invoke` for this
       field directly; `ThemeService` is the single source of truth (fe-ui-kit Q5).
     - `dashboardLayout`: `UiSelectComponent`, options `['default','compact','expanded']`.
     - `itemsPerPage`: `UiSelectComponent`, options `['5','10','25','50','100']`.
     `onSaveDisplay()`: calls `PUT /settings/system` with `{ dashboardLayout, itemsPerPage }`
     (theme omitted — ThemeService already persisted it). Uses `FormBuilder.nonNullable.group()`.
  4. **Admin section** (shown `@if (isAdmin())`):
     - `enableAdvancedMetrics`: `IonToggle`. String `'true'`/`'false'` in API.
     - `enableBetaFeatures`: `IonToggle`. String `'true'`/`'false'` in API.
     - `logLevel`: `UiSelectComponent`, options `['debug','info','warn','error']`.
     `onSaveAdmin()`: calls `PUT /settings/system` with the admin-only fields (string-
     converted booleans). Uses a separate `FormBuilder.nonNullable.group()` for admin fields.
  5. `isSaving` and `errorMessage` signals per save section.
  6. Unit tests: display section renders for all users; admin section hidden when
     `isAdmin === 'false'`; admin section shown when `isAdmin === 'true'`; theme segment
     calls `ThemeService.setTheme()`, not `api.invoke` directly; save sends correct
     payload without theme field.

- **Output:**
  - `settings-system.page.ts/html/scss/spec.ts` (replaces placeholder from T1).
  - `/fe-check` passes.

- **Parity:** mirrors `app/settings/system/page.tsx` (326 lines).
