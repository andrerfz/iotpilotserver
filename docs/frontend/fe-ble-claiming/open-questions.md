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

## Q2 — ESP32-C3 flash budget for a BLE stack _(resolved 2026-06-24)_

**Question:** The C3 sketch already uses ~95% of program flash (1256059 / 1310720
bytes). NimBLE adds tens of KB. Does it fit?

**Resolution: fits with a partition-scheme change — C3 stays in scope for v1.**
Measured (P0.2 spike, NimBLE-Arduino 2.5.0 + minimal GATT server linked into the
real firmware):

| Partition | Size with NimBLE | Fits? |
|---|---|---|
| `default` (1.25 MB app) | 1 477 273 B = **112%** | ❌ no |
| `min_spiffs` (1.875 MB app) | 1 477 313 B = **75%** | ✅ yes, ~490 KB headroom |

NimBLE costs ~216 KB. The C3 (T-OI Plus, 4 MB flash) **does not fit on the default
partition** but fits comfortably on `min_spiffs`. **Action:** A2 must build/flash
the C3 with `PartitionScheme=min_spiffs`. Switching the partition table requires a
full erase + reflash — already part of the claim/setup reflash (`ERASE=1`), so no
extra friction. No need to drop features or go Heltec-only.

## Q3 — Securing WiFi credentials over BLE _(pending)_

**Question:** The operator's WiFi password crosses the BLE link. Plaintext GATT is
sniffable.

- Require **LE Secure Connections bonding/encryption** before the `provision`
  characteristic is writable, or app-layer encrypt the payload with a key derived
  from the claiming token. At minimum, gate the `provision` char behind an encrypted
  link. Decide the exact scheme in A1.

## Q4 — Token issuance for a scanned device _(resolved 2026-06-24)_

**Question:** The app has a scanned `deviceId` and an authenticated operator. How
does it get a valid `claimingToken` to push?

**Resolution: reuse the existing `POST /api/devices/claim` — no backend change.**
`ClaimDeviceCommand` finds the device by string `deviceId`, requires it to be
UNCLAIMED (or PENDING_SETUP with an expired/unused token), associates it with the
operator's tenant, mints a one-time `XXXX-YYYY` token (15-min TTL), and returns
`{ deviceId, claimingToken, expiresAt, instructions }`. That is exactly the BLE
app's need (scan → claim → push token). C2 is therefore a no-op on the backend.

Edge cases for the app (C2/C3) to handle:
- Device not found / not in this tenant's inventory → `/claim` throws "Device not
  found" → app shows "unknown device, register it first".
- Device already PENDING_SETUP with a **valid unused** token (factory pre-registered,
  e.g. `make device-preregister`) → `/claim` rejects ("already claimed or not
  available"); read the existing token from `GET /api/devices/:id`
  → `pendingSetup.claimingToken` instead. The common BLE case (a fresh UNCLAIMED
  sensor) uses `/claim` directly.

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
