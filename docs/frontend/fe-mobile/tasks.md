# fe-mobile — Tasks

Each task is one small PR. Tasks must be executed in the order shown; T1–T3 are
sequentially dependent (native projects exist before plugins can be added). T4–T8
can proceed independently once T3 is green. T9 (CI pipeline) can only start after T5
(signing credentials are known and working locally).

## Status

| # | Task | Status |
|---|---|---|
| T1 | Capacitor scaffold: config + CLI + platform packages | pending |
| T2 | SecureStorage adapter + mobile token provider | pending |
| T3 | `cap add ios` + `cap add android` + `cap sync` in CI check | pending |
| T4 | Status bar + splash screen service | pending |
| T5 | Push notifications: plugin + permission flow + FCM setup | pending |
| T6 | APNs entitlements + deeplink routing | pending |
| T7 | Touch UX polish: safe-area, tap highlights, bottom-nav clearance | pending |
| T8 | Push token registration endpoint (backend gap + frontend consumer) | pending |
| T9 | Signed build pipeline: GitHub Actions iOS + Android workflows | pending |

---

### T1 — Capacitor scaffold: config + CLI + platform packages

- **Does:**
  1. Add `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` to
     `apps/frontend-ng/package.json` at `8.x` (matching the pinned `@capacitor/core@8.4.0`).
  2. Create `apps/frontend-ng/capacitor.config.ts` with `appId: 'com.iotpilot.app'`,
     `appName: 'IoT Pilot'`, `webDir: 'www'`, server URL override for local dev.
  3. Add `cap sync` to the `Makefile` as `make ng-cap-sync` (runs `ng build` then
     `cap sync` for both platforms).
  4. Update `ionic.config.json` integrations to `{ capacitor: {} }`.
  5. Add `ios/` and `android/` to `.gitignore` or commit the skeletons — see
     open-questions.md Q1 for the decision.
- **Output:** `capacitor.config.ts` present, `pnpm install` succeeds, `make ng-cap-sync`
  runs without error on a developer's machine with Xcode + Android Studio installed.
- **Invariant:** Do not add a server `url:` override that breaks the production build —
  the URL override must be conditional (`process.env.NODE_ENV === 'development'`).
- **BLOCKED BY:** Q1 (whether to commit or gitignore native project directories)

---

### T2 — SecureStorage adapter + mobile token provider

- **Does:**
  1. Add `@capacitor-community/secure-storage@^4.0.0` to `apps/frontend-ng/package.json`.
  2. Implement `CapacitorSecureStorageAdapter` in
     `apps/frontend-ng/src/app/core/native/secure-storage.adapter.ts` implementing
     `SecureStoragePort` (`getItem`, `setItem`, `removeItem`).
  3. Add `provideNativeTokenStorage(): Provider[]` in a new
     `apps/frontend-ng/src/app/core/native/native.providers.ts` that registers
     `SecureTokenStorage` over `CapacitorSecureStorageAdapter`.
  4. Document the provider swap pattern: in `main.ts`, call `provideNativeTokenStorage()`
     instead of `provideTokenStorage()` when running on a native platform
     (`Capacitor.isNativePlatform()`).
  5. Write unit tests for `CapacitorSecureStorageAdapter` using the plugin's built-in mock.
- **Output:** `apps/frontend-ng/src/app/core/native/secure-storage.adapter.ts` + test;
  `Vitest` green; `make ng-cap-sync` still green.
- **Invariant:** The `SecureStoragePort` abstract class in `token.storage.ts` must NOT be
  modified — the adapter implements it. Unit tests mock `@capacitor-community/secure-storage`
  using `vi.mock`.

---

### T3 — `cap add ios` + `cap add android` + `cap sync` in CI check

- **Does:**
  1. Run `cap add ios` and `cap add android` in `apps/frontend-ng/` to generate the
     native project directories.
  2. Commit the generated `ios/` and `android/` directories (or configure `.gitignore`
     based on T1 Q1 decision).
  3. Add a CI step to `ci.yml`: `cd apps/frontend-ng && ng build && npx cap sync --inline`.
     The step validates that the web build can be copied into the native shells without
     error. It does NOT compile the native projects (that requires Xcode/Android Studio).
  4. Update `Makefile` with `ng-cap-sync` target.
- **Output:** `ios/App/App.xcodeproj` + `android/app/build.gradle` present in the repo;
  CI step passes in GitHub Actions (Linux runner — `cap sync --inline` works without macOS).
- **Invariant:** `cap sync` must complete without errors on the Ubuntu CI runner. The
  `--inline` flag embeds the web assets without running a dev server.

---

### T4 — Status bar + splash screen service

- **Does:**
  1. Add `@capacitor/status-bar` and `@capacitor/splash-screen` to
     `apps/frontend-ng/package.json`.
  2. Implement `StatusBarService` in
     `apps/frontend-ng/src/app/core/native/status-bar.service.ts`:
     - `applyTheme(theme: 'light' | 'dark')` — calls `StatusBar.setStyle()` and
       `StatusBar.setBackgroundColor()` matching the active theme token
       (`--ion-background-color`).
     - Called from `ThemeService.setTheme()` via DI injection (not a direct import).
     - Guard with `Capacitor.isPluginAvailable('StatusBar')` so the web build does not
       crash.
  3. Implement `SplashService` in
     `apps/frontend-ng/src/app/core/native/splash.service.ts`:
     - Called from `ShellComponent` constructor: `SplashScreen.hide({ fadeOutDuration: 300 })`.
     - Guard with `Capacitor.isPluginAvailable('SplashScreen')`.
  4. Run `cap sync` to push plugin configs to native projects.
  5. Add splash screen image assets to `ios/App/App/Assets.xcassets/Splash/` and
     `android/app/src/main/res/` (use Ionic's splash generator script or provide the
     minimal required sizes).
- **Output:** `StatusBarService` + `SplashService` files; splash is hidden on app load in
  the native simulator; status bar color matches `ThemeService` active theme.
- **BLOCKED BY:** T3 (native projects must exist)

---

### T5 — Push notifications: plugin + permission flow + FCM setup

- **Does:**
  1. Add `@capacitor/push-notifications` to `apps/frontend-ng/package.json`; run
     `cap sync`.
  2. Create `PushNotificationService` in
     `apps/frontend-ng/src/app/core/native/push-notification.service.ts`:
     - `requestPermission()` — calls `PushNotifications.requestPermissions()`; returns
       `'granted' | 'denied' | 'prompt'`.
     - `register()` — calls `PushNotifications.register()` after permission grant.
     - `token$` — signal updated by the `registration` listener with the FCM/APNs
       device token string.
     - `notifications$` — signal updated by the `pushNotificationReceived` listener
       with the latest foreground push payload.
     - `notificationTapped$` — signal updated by `pushNotificationActionPerformed`
       listener (used by T6 for deeplink routing).
     - All listeners registered in `constructor()`, removed with `takeUntilDestroyed`.
     - Guard every Capacitor call with `Capacitor.isNativePlatform()`.
  3. Call `PushNotificationService.requestPermission()` and `register()` from
     `ShellComponent.ngOnInit()` — only when `Capacitor.isNativePlatform()`.
  4. Add the Firebase `google-services.json` (Android) to `android/app/` and
     `GoogleService-Info.plist` (iOS) to `ios/App/App/`. These files must be added to
     `.gitignore` (they contain API keys) — document in `apps/frontend-ng/MOBILE_SETUP.md`
     how to obtain them.
  5. Write a unit test for `PushNotificationService` using `vi.mock('@capacitor/push-notifications')`.
- **Output:** `PushNotificationService` file + test passing; `cap sync` green; permission
  dialog appears on first app launch in iOS Simulator; FCM/APNs device token logged to
  console (token registration callback fires).
- **BLOCKED BY:** T3 (native projects must exist); Q3 (backend endpoint for token
  registration — token is captured but not sent until T8)
- **BLOCKED BY:** Q2 (FCM vs APNs vs both — determines which `google-services.json` is
  needed)

---

### T6 — APNs entitlements + deeplink routing

- **Does:**
  1. Add APNs push capability to `ios/App/App.entitlements` (add
     `aps-environment: development` / `production` entitlement).
  2. Configure `associated-domains` entitlement for Universal Links if the team decides
     to support them — see open-questions.md Q6.
  3. Implement deeplink routing in `apps/frontend-ng/src/app/app.routes.ts`: when
     `PushNotificationService.notificationTapped$` emits a payload with a `route` key
     (e.g., `{ route: '/app/monitoring' }`), inject `Router` and `navigateByUrl(route)`.
  4. Add a `deeplinkHandler` call in `ShellComponent` (separate from the init push setup)
     that subscribes to `notificationTapped$` using `toObservable` + `takeUntilDestroyed`.
  5. Write an integration test that mocks a notification tap payload and verifies
     `Router.navigateByUrl` is called with the correct route.
- **Output:** `App.entitlements` updated; navigation fires when a mocked notification tap
  is received; test green.
- **BLOCKED BY:** T5 (push service must exist); Q6 (Universal Links decision)

---

### T7 — Touch UX polish: safe-area, tap highlights, bottom-nav clearance

- **Does:**
  1. Update `apps/frontend-ng/src/index.html` `<head>` to include
     `<meta name="apple-mobile-web-app-title" content="IoT Pilot">` and the correct
     `apple-mobile-web-app-status-bar-style` (already present: verify `black` matches the
     dark theme; update for light theme via JS or `content="default"`).
  2. Update `apps/frontend-ng/src/global.scss` to add safe-area insets for the
     bottom-nav bar:
     ```scss
     app-bottom-nav {
       padding-bottom: env(safe-area-inset-bottom);
     }
     ```
     and for the topbar:
     ```scss
     app-topbar {
       padding-top: env(safe-area-inset-top);
     }
     ```
  3. Audit every `ion-content` page in `apps/frontend-ng/src/app/features/` for
     `-webkit-tap-highlight-color` and `touch-action` correctness — the shell's global
     SCSS already sets `-webkit-tap-highlight-color: transparent`; verify it is not
     overridden in any feature component.
  4. Verify the `IonModal` / `BottomSheet` component dismisses correctly on swipe-down
     in the Capacitor WebView (Ionic 8 has native swipe-to-close on modals when
     `canDismiss` + `presentingElement` are set — verify the `BottomSheetComponent`
     uses them; add if missing).
  5. Smoke test in iOS Simulator: all four bottom-nav tabs respond to taps, swipe-back
     navigates correctly, modals swipe-dismiss.
- **Output:** Modified SCSS files; `bottom-nav.component.scss` has safe-area padding;
  `BottomSheetComponent` supports swipe-dismiss; simulator smoke test passes.
- **BLOCKED BY:** T3 (simulator requires native projects)

---

### T8 — Push token registration endpoint (backend gap + frontend consumer)

- **Does:**
  1. Backend (`apps/backend/`): add `POST /users/me/push-token` (body:
     `{ token: string, platform: 'ios' | 'android' }`) and
     `DELETE /users/me/push-token` (no body) to the user router. Store the token in a
     new `push_token` field on the `User` Prisma model (or a separate `PushToken` table
     if multiple devices per user are needed — see open-questions.md Q4).
  2. Add the two endpoints to `docs/openapi.yml`; run `make ng-api-generate` to
     regenerate the frontend client.
  3. Backend migration: `make migrate` (or add a SQL migration in
     `apps/backend/prisma/migration/`).
  4. Frontend: update `PushNotificationService` to call `POST /users/me/push-token`
     when `token$` emits (after registration); call `DELETE /users/me/push-token`
     from `AuthService.logout()`.
  5. Write a unit test for the token-registration flow mocking the generated API client.
- **Output:** `POST /users/me/push-token` returns 200; token stored in DB; `DELETE`
  clears it; frontend registers and deregisters correctly; tests green; `make ng-api-check`
  green.
- **BLOCKED BY:** T5 (push service captures the token); Q4 (single vs multi-device token
  storage strategy)

---

### T9 — Signed build pipeline: GitHub Actions iOS + Android workflows

- **Does:**
  1. Add `.github/workflows/mobile-ios.yml`: triggered on `workflow_dispatch` +
     `push` to `release/mobile`. Steps: checkout, pnpm install, `ng build --configuration production`,
     `cap sync`, select Xcode version, import code-signing cert + provisioning profile
     from GitHub Secrets, `xcodebuild archive`, `xcodebuild -exportArchive` to produce
     `.ipa`, upload artifact.
  2. Add `.github/workflows/mobile-android.yml`: triggered same. Steps: checkout, pnpm
     install, `ng build --configuration production`, `cap sync`, set up JDK 17,
     `./gradlew bundleRelease`, sign with `signingReport` (key from GitHub Secrets),
     upload `app-release.aab` artifact.
  3. Document required GitHub Secrets in `apps/frontend-ng/MOBILE_SETUP.md`:
     - iOS: `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`,
       `APPLE_PROVISIONING_PROFILE_BASE64`, `APPLE_TEAM_ID`.
     - Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`,
       `ANDROID_KEY_PASSWORD`, `ANDROID_STORE_PASSWORD`.
  4. Add `ng-cap-build-ios` and `ng-cap-build-android` Makefile targets for local
     signed builds.
- **Output:** Both workflow files present; a manual `workflow_dispatch` run on a macOS
  GitHub Actions runner produces a signed `.ipa` and an `.aab` artifact; artifacts
  downloadable from the Actions UI.
- **BLOCKED BY:** T3 (native projects must be in the repo); Q5 (GitHub Actions vs
  Fastlane — chosen approach determines workflow structure); Q7 (App Store vs ad-hoc
  distribution determines the provisioning profile type)
