# fe-mobile — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `capacitor.config.ts` exists; `pnpm install` succeeds; `make ng-cap-sync` runs without error on a dev machine; `ionic.config.json` has `integrations.capacitor`; CI is still green |
| T2 | `CapacitorSecureStorageAdapter` unit tests pass; `SecureTokenStorage` integration test stores and retrieves a token via the adapter mock; no changes to the `SecureStoragePort` interface in `token.storage.ts` |
| T3 | `ios/App/App.xcodeproj` and `android/app/build.gradle` committed; the CI `cap sync --inline` step passes on the Ubuntu runner; no new lint or type-check errors |
| T4 | In iOS Simulator: splash screen dismisses with fade; status bar background color matches the active theme color; switching theme via Settings updates the status bar color immediately; unit tests for both services pass |
| T5 | In iOS Simulator: permission dialog appears on first launch; FCM/APNs token is logged to the Xcode console; `PushNotificationService` unit test with mocked plugin passes; `cap sync` adds the push entitlement to the Xcode project |
| T6 | An `xcrun simctl push` command delivering a payload with `{ "route": "/app/monitoring" }` causes the running app to navigate to MonitoringPage; `App.entitlements` contains the `aps-environment` key; integration test with mocked `notificationTapped$` verifies router call |
| T7 | In iPhone SE (375px) Simulator: bottom-nav bar does not overlap the home-indicator area; topbar is not hidden behind the status bar; all four bottom-nav tabs respond to taps within 100ms; modal swipe-dismiss works; no visual regression on iPad split-view (≥1080px) |
| T8 | `POST /users/me/push-token` returns 200; token persists in DB (verify with `make db-shell`); logout calls `DELETE` and clears it; `make ng-api-check` green; backend unit tests pass |
| T9 | A `workflow_dispatch` run on GitHub Actions produces a `.ipa` artifact downloadable from the Actions UI; an `.aab` artifact is produced by the Android workflow; both artifacts install on a real device or simulator without crash on first screen |

## Module-level scenarios

```gherkin
Feature: Capacitor native app bootstrap

  Scenario: App launches and dismisses splash screen
    Given the iOS app is installed on an iPhone simulator
    When I open the app
    Then the splash screen appears briefly
    And it fades out within 500ms
    And the Dashboard page is visible

  Scenario: Status bar matches the active theme
    Given the app is running in dark mode
    When I inspect the status bar
    Then the status bar background matches the dark theme background color

    Given the app is running in light mode
    When I inspect the status bar
    Then the status bar background matches the light theme background color

Feature: Secure token storage on mobile

  Scenario: Token survives app relaunch
    Given I am logged in on the native iOS app
    When I force-quit the app and reopen it
    Then I see the Dashboard without being prompted to log in again

  Scenario: Token is cleared on logout
    Given I am logged in on the native iOS app
    When I tap Sign Out
    Then the app navigates to the login screen
    And reopening the app without logging in shows the login screen

Feature: Push notifications

  Scenario: Permission requested on first launch
    Given the app is freshly installed on an iPhone
    When the app reaches the shell
    Then an iOS push notification permission dialog appears

  Scenario: Foreground push notification is received
    Given I am on the Dashboard
    When a push notification arrives with title "Device offline" and body "pi-sensor-01"
    Then an in-app toast or banner appears with that message

  Scenario: Tapping a push notification navigates to the correct page
    Given a push notification with route "/app/monitoring" is received while the app is in the background
    When I tap the notification
    Then the app opens and navigates to the Monitoring page

Feature: Touch UX

  Scenario: Bottom navigation is visible above the home indicator
    Given the app is running on an iPhone with a home indicator (no home button)
    When I view any page
    Then the bottom navigation bar bottom edge is above the home indicator safe area

  Scenario: Modal swipe-dismiss works
    Given any bottom-sheet modal is open (e.g., RegisterDeviceSheet)
    When I swipe down on the modal
    Then the modal dismisses smoothly without requiring a button tap
```

## Parity checklist

fe-mobile does not replace a legacy page — it wraps the entire completed app. The
parity contract is behavioral equivalence between the Capacitor WebView and the plain
browser for all features delivered by prior modules.

| Domain | Behaviors to verify in Capacitor WebView |
|---|---|
| Auth | Login, logout, session restore; 2FA flow; session revocation |
| Dashboard | Device list loads; real-time updates via socket arrive; RegisterDeviceSheet opens |
| Monitoring | Alert list loads; alert trend chart renders (ECharts in WebView) |
| Device detail | Overview, storage, network, commands, logs tabs all load |
| Device advanced | Real-time metrics charts render; SSH terminal sends commands and shows output |
| Admin | Stats, devices, users, logs, system pages load for ADMIN role |
| Settings | Profile, security, system, notifications pages load; theme toggle updates status bar |
| Shell | Bottom nav visible on mobile (≤1080px); rail visible on iPad (≥1080px); command palette opens |

## Exit checklist (module → done)

- [ ] All tasks merged and green in CI
- [ ] README module table updated to `done`
- [ ] Open questions all `_resolved_`
- [ ] `make ng-cap-sync` documented in the project README / Makefile help
- [ ] `apps/frontend-ng/MOBILE_SETUP.md` documents Xcode/Android Studio prerequisites,
      obtaining `google-services.json` + `GoogleService-Info.plist`, and populating
      GitHub Secrets
- [ ] fe-cutover can now begin (it depends on all page modules being done, and fe-mobile
      being done means the native targets are also green)
