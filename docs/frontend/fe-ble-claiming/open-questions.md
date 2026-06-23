# fe-ble-claiming — Open Questions

Resolve Q1 and Q2 (Phase 0) before building. Record the decision + date when closed.

## Q1 — macOS runtime: Mac Catalyst vs Electron _(pending — gating)_

**Question:** Capacitor has no native macOS platform. How do we ship a macOS app
with BLE?

- **Option A — Mac Catalyst** (recommended): build the existing iOS Capacitor target
  for Mac. `@capacitor-community/bluetooth-le` uses CoreBluetooth on iOS, which
  Catalyst supports. Reuses the iOS app 1:1; matches the backlog note
  ("use @capacitor-community/bluetooth-le"). Risk: Catalyst + Capacitor WKWebView +
  plugin edge cases; needs the Bluetooth entitlement.
- **Option B — Electron** (`@capacitor-community/electron`): a real desktop app; BLE
  via Chromium **Web Bluetooth** or a Node BLE lib (`@abandonware/noble`). True
  cross-platform desktop, but a second runtime to maintain and Web Bluetooth's
  device-picker UX is browser-driven.
- **Option C — "Designed for iPad" on Apple Silicon**: ship the unmodified iOS app
  via the App Store; it runs on M-series Macs with CoreBluetooth. Zero macOS code but
  Apple-Silicon-only + App Store distribution.

**Decide via P0.1 spike.** Leaning A (Catalyst) for code reuse; fall back to B
(Electron) if Catalyst BLE is unreliable.

## Q2 — ESP32-C3 flash budget for a BLE stack _(pending — gating, CRITICAL)_

**Question:** The C3 sketch already uses ~95% of program flash (1256059 / 1310720
bytes). NimBLE adds tens of KB. Does it fit?

- Measure with the P0.2 spike. Mitigations if tight: switch partition scheme
  (`min_spiffs` / `huge_app` frees program space), trim unused libs, or drop a
  feature. **If it cannot fit**, v1 ships **Heltec-only** BLE claiming (ESP32-S3 has
  ample flash) and the C3 keeps the AP/portal flow until a slimmer BLE build exists.

## Q3 — Securing WiFi credentials over BLE _(pending)_

**Question:** The operator's WiFi password crosses the BLE link. Plaintext GATT is
sniffable.

- Require **LE Secure Connections bonding/encryption** before the `provision`
  characteristic is writable, or app-layer encrypt the payload with a key derived
  from the claiming token. At minimum, gate the `provision` char behind an encrypted
  link. Decide the exact scheme in A1.

## Q4 — Token issuance for a scanned device _(pending)_

**Question:** The app has a scanned `deviceId` and an authenticated operator. How
does it get a valid `claimingToken` to push?

- Verify `POST /api/devices/claim` (authenticated) returns/creates a claiming token
  for a given deviceId. If it does, reuse it; if not, add a minimal endpoint. The
  device must be pre-registered (UNCLAIMED/PENDING_SETUP) — define what the app shows
  when a scanned device isn't registered to this tenant.

## Q5 — BLE↔WiFi coexistence on the single-radio C3 _(pending)_

**Question:** The ESP32-C3 has one 2.4 GHz radio; BLE and WiFi don't run well
simultaneously.

- Plan: sequential — advertise/receive over BLE, **stop BLE**, then bring up WiFi to
  activate. Confirm the controller releases cleanly and that a failed WiFi attempt
  can re-enter BLE setup. Validate in A5.

## Q6 — macOS distribution _(pending — non-gating)_

**Question:** How is the macOS app distributed — notarized standalone `.app`,
App-Store "Designed for iPad", or internal/unsigned for the ops team?

- Depends on Q1. Decide before D2 (CI signing). Internal notarized `.app` is likely
  enough for an internal provisioning tool.
