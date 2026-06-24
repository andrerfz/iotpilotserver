# fe-ble-claiming — Tasks

Each task is one small PR. Phases are ordered: **Phase 0 gates everything** (two
feasibility decisions). Firmware (A) and app-runtime (B) can proceed in parallel
once Phase 0 is resolved; claim UI (C) needs A's GATT contract + B's runtime; E2E
(D) is last.

## Status

| # | Task | Phase | Status |
|---|---|---|---|
| P0.1 | Decide macOS runtime (Catalyst vs Electron) — spike both BLE paths | 0 | 🔴 pending |
| P0.2 | C3 flash-budget spike: does NimBLE fit? partition options? | 0 | ✅ done — NimBLE fits on `min_spiffs` (75%), not on `default` (112%). C3 in scope; see Q2 |
| A1 | Define the BLE setup GATT contract (service + characteristics + status codes) | A | ✅ done — [`gatt-contract.md`](gatt-contract.md) |
| A2 | ESP32-C3: advertise setup service + GATT server in setup mode (build with `PartitionScheme=min_spiffs` — see Q2) | A | 🟡 code complete — compiles at 75% on min_spiffs; **pending hardware validation** |
| A3 | ESP32-C3: receive `{ssid,password,claimingToken}`, run `activateDevice()`, report status over BLE | A | 🟡 code complete — **pending hardware validation** (BLE↔WiFi teardown/retry = A5) |
| A4 | Heltec LoRa32 V3: port A2+A3 | A | 🔴 pending |
| A5 | BLE↔WiFi coexistence + deep-sleep/timeout handling | A | 🔴 pending |
| B1 | Add macOS app target + `make ng-cap-build-macos` | B | 🔴 pending — gated on P0.1 |
| B2 | Install `@capacitor-community/bluetooth-le`; permissions/entitlements/Info.plist | B | 🔴 pending |
| C1 | `BleProvisioningService` in core: scan / connect / write creds / read status | C | 🔴 pending |
| C2 | Backend: issue a claiming token for a scanned deviceId to an authed operator | C | 🔴 pending |
| C3 | Register-device flow: "Scan via Bluetooth" → pick → provision | C | 🔴 pending |
| C4 | Provisioning progress UI + reconcile to ONLINE via device list/socket | C | 🔴 pending |
| D1 | End-to-end claim on real C3 + Heltec hardware; failure-mode QA | D | 🔴 pending |
| D2 | macOS signed/notarized build in CI | D | 🔴 pending |

---

## Phase 0 — Feasibility (gating)

### P0.1 — macOS runtime decision
- **Do:** spike a minimal "scan for any BLE device" on (a) Mac Catalyst build of the
  iOS Capacitor app using `@capacitor-community/bluetooth-le`, and (b) an Electron
  build using Web Bluetooth. Confirm BLE scan + connect + GATT write works on macOS.
- **Output:** a decision recorded in [`open-questions.md`](open-questions.md) Q1 with
  the working approach; the loser is dropped.
- **Why first:** the runtime choice changes B1/B2 and the plugin API surface in C1.

### P0.2 — C3 flash-budget spike
- **Do:** add NimBLE-Arduino (or ESP-IDF NimBLE) to a throwaway C3 build with a
  trivial advertiser and measure program-flash usage. Current sketch is ~95% of
  1310720 bytes. Try the `min_spiffs`/`huge_app` partition scheme to free program
  space if needed.
- **Output:** "fits / fits-with-partition-change / does-not-fit" recorded in Q2. If
  it does not fit, A2–A3 ship **Heltec-only** first and C3 stays on AP flow.
- **Why first:** decides whether the C3 is in scope at all for v1.

---

## Phase A — Firmware BLE

### A1 — GATT contract ✅
Defined in [`gatt-contract.md`](gatt-contract.md): setup service + `device-info` /
`provision` (encrypted) / `command` / `status` characteristics, payload shapes,
the `status` enum, advertisement format, and the happy-path sequence. That doc is
the single source of truth — keep firmware and `BleProvisioningService` in sync
with it, and reference it from both firmware READMEs when A2/A4 land.

### A2 — C3 advertiser + GATT server (setup mode only)
- On boot-with-no-config (or factory-reset), start BLE advertising + GATT server
  instead of (or alongside) the AP portal. Gate behind the P0.2 outcome.

### A3 — C3 receive + activate + report
- On `provision` write + `activate` command: store nothing yet, connect to WiFi with
  the given creds, call the existing `activateDevice(claimingToken)`, then write the
  result to `status` (and persist apiKey/webhookUrl exactly as today on success).

### A4 — Heltec port
- Port A2+A3 to `heltec-lora32v3-firmware` (ESP32-S3 — more flash, no budget risk).

### A5 — Coexistence + lifecycle
- Single-radio C3: sequence BLE-advertise → receive → stop BLE → WiFi-connect →
  activate. Add a setup-mode timeout that falls back to AP portal so a device is
  never strandable. Verify deep-sleep still works post-claim.

---

## Phase B — macOS app runtime

### B1 — macOS target + make target
- Per P0.1: add the platform (Catalyst target or `@capacitor-community/electron`),
  and a `make ng-cap-build-macos` mirroring `ng-cap-build-ios/android`.

### B2 — BLE plugin + permissions
- Install `@capacitor-community/bluetooth-le`; add macOS Bluetooth entitlement +
  `NSBluetoothAlwaysUsageDescription` (Catalyst) or Electron BLE permission handler.

---

## Phase C — Claim UI

### C1 — BleProvisioningService
- Angular service in `core/`: `scan()` (filter by the A1 service UUID), `connect()`,
  `writeProvision()`, `observeStatus()`. Mockable; unit-tested with a fake plugin
  (mirror the SocketService spec pattern).

### C2 — Backend token issuance
- Verify whether `POST /api/devices/claim` already returns a claiming token for a
  given deviceId to an authenticated operator; if not, add a minimal endpoint. The
  app must turn a scanned `deviceId` into a valid `claimingToken`.

### C3 — Register-device "Scan via Bluetooth"
- Add a BLE entry point to the existing register-device sheet: scan → list found
  sensors (deviceId + signal) → pick → enter WiFi once (remembered) → provision.
  Manual Device-ID entry stays as the fallback (and the only path for ESP8266).

### C4 — Progress + reconcile
- Show provisioning progress from the BLE `status` notifications; on `ACTIVATED`,
  reconcile against the device list (reuse the `device:update` socket) until ONLINE.

---

## Phase D — End-to-end & release

### D1 — Hardware E2E + failure QA
- Real C3 (if P0.2 passed) + Heltec: happy path, wrong WiFi password, wrong/expired
  token, out-of-range, app backgrounded, two devices in range.

### D2 — macOS signed build in CI
- Notarized/signed macOS artifact (or App-Store "Designed for iPad" path) in the
  existing GitHub Actions signed-build pipeline.
