# IoT Pilot — Mobile Build Setup

This guide covers the one-time setup required to build and distribute the iOS and
Android apps produced by the Capacitor wrapper around the Angular frontend.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 | `nvm install 22` |
| pnpm | 11 | `npm i -g pnpm@11` |
| Xcode | 16+ | Mac App Store (iOS only) |
| CocoaPods | latest | `brew install cocoapods` (iOS only) |
| JDK | 17 | `brew install openjdk@17` (Android only) |
| Android Studio | latest | [developer.android.com](https://developer.android.com/studio) (Android only) |

---

## Firebase configuration files

Push notifications require Firebase project configuration files.
**These files contain API keys and must never be committed.** They are listed in
`.gitignore` and must be placed manually before building.

### Obtaining the files

1. Go to the [Firebase Console](https://console.firebase.google.com/) and open the
   **iotpilot** project (or create it if it doesn't exist).
2. Select **Project settings → Your apps**.

**iOS — `GoogleService-Info.plist`**
- Add an iOS app with bundle ID `com.iotpilot.app` if not already present.
- Click **Download GoogleService-Info.plist**.
- Place it at: `apps/frontend-ng/ios/App/App/GoogleService-Info.plist`

**Android — `google-services.json`**
- Add an Android app with package name `com.iotpilot.app` if not already present.
- Click **Download google-services.json**.
- Place it at: `apps/frontend-ng/android/app/google-services.json`

---

## Local build

```bash
# 1. Install dependencies
pnpm install

# 2. Build web assets + sync to native projects
make ng-cap-sync

# iOS signed build (macOS + Xcode required)
make ng-cap-build-ios

# Android signed build (JDK 17 required)
make ng-cap-build-android
```

---

## GitHub Actions CI

Two workflows handle signed releases:

| Workflow | File | Runner |
|---|---|---|
| iOS | `.github/workflows/mobile-ios.yml` | `macos-15` |
| Android | `.github/workflows/mobile-android.yml` | `ubuntu-24.04` |

Both trigger on:
- **`workflow_dispatch`** — manual run from the Actions UI
- **push to `release/mobile`** — automatic on release commits

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions** on the repository.

#### iOS secrets

| Secret | Description |
|---|---|
| `APPLE_CERTIFICATE_BASE64` | Distribution certificate (`.p12`) encoded as base64: `base64 -i Certificates.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Password protecting the `.p12` file |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Provisioning profile (`.mobileprovision`) encoded as base64: `base64 -i App.mobileprovision` |
| `APPLE_TEAM_ID` | 10-character Apple Developer Team ID (found in the Apple Developer portal) |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | `GoogleService-Info.plist` encoded as base64: `base64 -i GoogleService-Info.plist` |

#### Android secrets

| Secret | Description |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Release keystore (`.jks`) encoded as base64: `base64 -i release.jks` |
| `ANDROID_KEY_ALIAS` | Alias of the signing key inside the keystore |
| `ANDROID_KEY_PASSWORD` | Password for the signing key |
| `ANDROID_STORE_PASSWORD` | Password for the keystore file |
| `GOOGLE_SERVICES_JSON_BASE64` | `google-services.json` encoded as base64: `base64 -i google-services.json` |

### Creating the Android keystore (first time)

```bash
keytool -genkeypair \
  -alias iotpilot-release \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -keystore release.jks \
  -storepass <store-password> \
  -keypass <key-password> \
  -dname "CN=IoT Pilot, O=YuRest, C=ES"
```

Store `release.jks` securely — losing it makes future Play Store updates impossible.

---

## Distribution

| Platform | Method |
|---|---|
| iOS | Ad-hoc (internal testers via UDIDs) — update `ExportOptions.plist` `method` to `app-store` for App Store submissions |
| Android | Internal `.aab` upload to Play Console (Internal Testing track) |
