# fe-mobile — Open Questions

## Q1 _resolved_ — Commit or gitignore native project directories (`ios/`, `android/`)

**Decision:** Commit `ios/` and `android/` to the repo (Option A). Native project
directories are tracked in git so that manual Xcode/Android Studio edits (entitlements,
splash assets, build settings) survive CI without a separate scripting layer. A
`.gitattributes` diff=binary rule is added on auto-generated XML/Gradle files to suppress
unhelpful diffs. Follows the Capacitor documentation recommendation.

**Resolved:** 2026-06-16
**Applies to:** T1, T3

---

## Q2 _resolved_ — Push provider: FCM only, APNs only, or both

**Decision:** FCM for both Android and iOS (Option A). One Firebase project, one
`firebase-admin` send path on the backend. APNs is configured as the underlying Apple
credential in Firebase Console; the app code and backend are unified. The extra Google
relay hop on iOS is an acceptable trade-off for the operational simplicity.
`GoogleService-Info.plist` (iOS) and `google-services.json` (Android) are required;
both are added to `.gitignore` and documented in `MOBILE_SETUP.md`.

**Resolved:** 2026-06-16
**Applies to:** T5, T8

---

## Q3 _resolved_ — Backend push-token registration endpoint

**Decision:** Add `POST /users/me/push-token` + `DELETE /users/me/push-token` to the
user router (Option A). The token is stored in a separate `PushToken` entity in the
monitoring bounded context (see Q3 + Q4 together). Endpoints added to `docs/openapi.yml`
and the generated Angular client is regenerated via `make ng-api-generate`.

**Resolved:** 2026-06-16
**Applies to:** T8

---

## Q4 _resolved_ — Single vs multi-device push token storage

**Decision:** One token per user, stored in a separate `PushToken` entity in the
monitoring BC (combining Q3 + Q4 decisions). Schema: `PushToken { id, userId, token,
platform: 'ios'|'android', updatedAt }` — one row per user, upserted on
`POST /users/me/push-token`. `DELETE /users/me/push-token` removes the row for the
calling user. A new login from another device overwrites the previous token. This is
correct for the IoT NOC use case (operators monitor from one device). The separate entity
keeps the User aggregate clean while the one-per-user constraint keeps the schema simple.
Escalate to multi-device if needed post-launch.

**Resolved:** 2026-06-16
**Applies to:** T8

---

## Q5 _resolved_ — Build pipeline: GitHub Actions native vs Fastlane

**Decision:** GitHub Actions steps directly (Option A). `xcodebuild archive` +
`xcodebuild -exportArchive` for iOS; `./gradlew bundleRelease` for Android. No Ruby/
Fastlane dependency. Signed artifacts (`.ipa`, `.aab`) are uploaded as GitHub Actions
artifacts; store submission is manual initially. Migrate to Fastlane if manual upload
becomes a bottleneck.

**Resolved:** 2026-06-16
**Applies to:** T9

---

## Q6 _resolved_ — Universal Links / App Links support

**Decision:** Skip Universal Links for now (Option A). Deep links from push notification
taps use the Capacitor notification action payload (`route` key), which works without
`associated-domains` entitlements or `apple-app-site-association` hosting. Revisit if
marketing/operations requires that `iotpilot.app` URLs open the native app directly.

**Resolved:** 2026-06-16
**Applies to:** T6

---

## Q7 _resolved_ — App store distribution vs enterprise / ad-hoc

**Decision:** Target App Store distribution (iOS) and Google Play internal testing track
(Android) for the signed build pipeline. Rationale: the product is a commercial IoT
management platform, not an enterprise-internal tool. The signed build pipeline uses an
App Store distribution provisioning profile. Ad-hoc distribution (limited to registered
UDIDs) is not suitable at scale; enterprise distribution requires a separate Apple
Enterprise account.

**Resolved:** 2026-06-15
**Applies to:** T9

---

## Q8 _resolved_ — Capacitor version alignment (8.x)

**Decision:** All Capacitor packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`,
`@capacitor/android`, `@capacitor/status-bar`, `@capacitor/splash-screen`,
`@capacitor/push-notifications`) pinned to `8.x` matching the already-installed
`@capacitor/core@8.4.0`. Using a community secure-storage plugin at a compatible version
(`@capacitor-community/secure-storage@^4.0.0` supports Capacitor 6+).

**Resolved:** 2026-06-15
**Applies to:** T1, T2, T4, T5

---

## Q9 _resolved_ — SecureTokenStorage provider swap mechanism

**Decision:** Use a runtime platform check (`Capacitor.isNativePlatform()`) in `main.ts`
to choose between `provideTokenStorage()` (web → `InMemoryTokenStorage`) and
`provideNativeTokenStorage()` (mobile → `SecureTokenStorage`). The switch is a single
conditional in the bootstrap providers array:

```ts
...(Capacitor.isNativePlatform() ? provideNativeTokenStorage() : [provideTokenStorage()])
```

This avoids a separate Angular build configuration per platform and keeps the web build
unchanged. The `SecureStoragePort` abstraction (already in `token.storage.ts`) is the
seam; no changes to `AuthService` or downstream callers.

**Resolved:** 2026-06-15
**Applies to:** T2
