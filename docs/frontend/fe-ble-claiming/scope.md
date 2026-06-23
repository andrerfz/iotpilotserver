# fe-ble-claiming — Scope

> Backlog item #6 (see [`docs/frontend/README.md`](../README.md)). Cross-layer
> feature: **firmware + Capacitor macOS app + claim UI + backend**. Lives under
> `docs/frontend/` because the app/UI is the bulk, but it owns firmware tasks too.

## Goal

Replace the manual **Device-ID + WiFi captive-portal** claiming flow with **BLE
discovery + provisioning** from a desktop (macOS) app: the operator opens the app
(already logged into the dashboard), it scans for nearby sensors in setup mode,
they pick one, and the app pushes WiFi credentials + the claiming token over BLE.
The sensor then runs its existing activation against the backend and comes online —
no AP join, no captive portal, no manual ID typing.

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
