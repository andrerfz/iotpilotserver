# fe-ble-claiming — Scope

> Backlog item #6 (see [`docs/frontend/README.md`](../README.md)). Cross-layer
> feature: **firmware + Capacitor macOS app + claim UI + backend**. Lives under
> `docs/frontend/` because the app/UI is the bulk, but it owns firmware tasks too.

## Goal

Make claiming **simple enough for a non-technical operator** and **much faster**
than today's captive-portal flow, by adding **BLE discovery + provisioning** from a
desktop (macOS) app as the primary, easy path.

The operator (already logged into the dashboard) opens the app, it scans for nearby
sensors in setup mode, they pick one from a list, type the WiFi password once, and
tap claim — the app pushes WiFi credentials + the claiming token over BLE and the
sensor activates itself. No AP-network switching, no captive portal, no copying a
Device ID by hand, no guessing which `IotPilot-Setup-XXXX` network is which.

**This does not remove the portal flow** — it adds an easier path alongside it. The
AP/captive-portal remains the fallback (and the only path for ESP8266). BLE becomes
the recommended default because it collapses a multi-step, error-prone manual
process into "pick from a list → enter WiFi once → done", which is the part that
confuses non-technical users and eats the most time when claiming many sensors.

### Why it's faster / simpler (the UX win)

| Captive-portal (today) | BLE (this module) |
|---|---|
| Read the Device ID off a tiny label / QR | Device announces its own ID — pick from a list |
| Leave the app, join the `IotPilot-Setup-XXXX` WiFi AP | Stay in the app |
| Wait for the captive portal to pop (often doesn't) | — |
| Type WiFi SSID + password **per device** | Type WiFi once, reuse across devices |
| Type/scan the claiming token | App fetches the token automatically |
| Rejoin your normal WiFi afterwards | — |

For someone claiming a batch of sensors, BLE turns minutes-per-device of fiddly
network-switching into seconds.

## How it changes the current flow

Today (AP/portal): power on → sensor opens `IotPilot-Setup-XXXX` AP → operator
joins it → captive portal (WiFiManager) → types WiFi creds + claiming token →
sensor `POST /api/devices/activate` → stores `apiKey`/`webhookUrl` in NVS.

Target (BLE): power on → sensor advertises a BLE setup service (deviceId in the
advertisement) → operator opens the app → app lists discovered sensors → operator
picks one → app fetches the claiming token for that deviceId from the backend and
writes `{ssid, password, claimingToken}` over BLE → sensor connects to WiFi and
runs the **same** `activateDevice()` path → reports activation result back over
BLE → app reconciles against the device list (ONLINE).

The on-device activation logic (`activateDevice()` in firmware) is reused
unchanged; BLE only replaces the **input** of WiFi creds + token.

## Layers & ownership

| Layer | What | Where |
|---|---|---|
| Firmware BLE | GATT setup-mode server: advertise deviceId, receive creds+token, report status; coexist with WiFi | `firmware/esp32c3-claiming-firmware/`, `firmware/heltec-lora32v3-firmware/` |
| App runtime | macOS Capacitor target + BLE plugin + permissions | `apps/frontend-ng/` (`capacitor.config.ts`, native project, `Makefile` `ng-cap-build-macos`) |
| Claim UI | BLE scan/connect/provision service + register-device flow | `apps/frontend-ng/src/app/...` |
| Backend | Issue/fetch a claiming token for a discovered deviceId to an authenticated operator | `apps/backend/src/routes/devices.router.ts` (verify vs existing `/devices/claim`) |

## In scope

- BLE setup-mode GATT server on **ESP32-C3** (T-OI Plus) and **Heltec LoRa32 V3** (ESP32-S3).
- A macOS desktop build of the Capacitor app with BLE support.
- BLE scan → pick → provision UI, integrated into the existing register-device flow.
- Backend support for the app to obtain a claiming token for a scanned device.
- Secure transport of WiFi credentials over BLE (bonding/encryption — see open-questions Q3).

## Out of scope

- **ESP8266 sensors** — no BLE hardware. They keep the AP/captive-portal flow. The
  app must degrade gracefully (offer manual entry when no BLE device is found).
- OTA over BLE (firmware updates stay over WiFi — see `docs/firmware-ota/`).
- Re-provisioning already-claimed devices (this is first-claim only; WiFi changes
  stay on the existing portal path).
- iOS/Android claim UI — the same plugin works there, but shipping mobile claim is
  a follow-up; this module targets macOS first.

## Prerequisites / current state

- Capacitor 8.4 with **iOS + Android** platforms already scaffolded
  (`apps/frontend-ng/{ios,android}`); **no macOS/Electron** platform yet.
- `@capacitor-community/bluetooth-le` is **not** installed.
- Firmware activation flow is implemented and reused (`activateDevice()`); the
  ESP32-C3 image is already at **~95% program flash** — adding a BLE stack is a
  hard feasibility gate (open-questions Q2).
- Backend `/api/devices/activate` (token → apiKey+webhookUrl) and `/api/devices/claim`
  (authenticated) exist; token-issuance-by-deviceId for the app needs verification.

## Two gating decisions (resolve before building — see open-questions.md)

1. **macOS runtime** (Q1): Mac Catalyst (reuse the iOS app + CoreBluetooth via the
   bluetooth-le plugin) vs Electron (Web Bluetooth). Recommendation: Catalyst.
2. **C3 flash budget** (Q2): does NimBLE fit in the remaining ~5% / can the
   partition scheme be changed? If not, BLE claiming ships Heltec-only first.
