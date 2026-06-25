# fe-ble-claiming — BLE setup-mode GATT contract (A1)

The contract between a sensor in **setup mode** and the claiming app. Implemented
by the firmware (ESP32-C3, Heltec LoRa32 V3) and consumed by `BleProvisioningService`
in `apps/frontend-ng`. ESP8266 does not implement this (no BLE).

## UUIDs

Custom 128-bit UUIDs (base `8e9aXXXX-1b2c-4f3d-9a6b-1f2e3d4c5b6a`):

| Role | UUID | Properties |
|---|---|---|
| **Setup service** | `8e9a0001-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | — |
| `device-info` | `8e9a0002-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | Read |
| `provision` | `8e9a0003-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | Write (encrypted link required) |
| `command` | `8e9a0004-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | Write |
| `status` | `8e9a0005-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | Read + Notify |
| `networks` | `8e9a0006-1b2c-4f3d-9a6b-1f2e3d4c5b6a` | Read |

### `networks` (Read) — JSON
WiFi SSIDs the sensor scanned at setup boot, so the app offers a pick-list instead
of free-text SSID entry (avoids typos like `YUREST` vs `Yurest`). De-duped on the
device, capped at 15.
```json
[ { "ssid": "YUREST", "rssi": -52 }, { "ssid": "Guest", "rssi": -77 } ]
```
Single-radio note: the scan runs **before** BLE starts (WiFi and BLE can't run
together on the C3), so the list is from boot time. Empty `[]` → the app falls back
to manual SSID entry.

## Advertisement

- Advertises the **setup service UUID** (so the app filters by it and ignores
  unrelated BLE devices).
- Local name: `IotPilot-Setup-<XXXX>` where `<XXXX>` is the last 4 chars of the
  `deviceId` (lets the operator disambiguate without connecting).
- Advertised only while in setup mode (unclaimed / factory-reset / WiFi-failed
  fallback). Stops once activation succeeds or the setup-mode timeout fires.

## Characteristics

### `device-info` (Read) — JSON
```json
{ "deviceId": "IOT-LHX8-MP99", "model": "LILYGO-T-OI-PLUS-C3", "fw": "1.1.3" }
```
Lets the app confirm identity/model before provisioning and map to the backend
device record.

### `provision` (Write, encrypted) — JSON
```json
{ "ssid": "YUREST", "password": "•••", "claimingToken": "PROD-0002" }
```
- Carries the operator's WiFi credentials + the claiming token the app fetched from
  the backend for this `deviceId`.
- **Writable only over an encrypted/bonded link** — `WRITE_ENC` + Just Works pairing
  (implemented, Q3); it contains the WiFi password.
- If the JSON exceeds the negotiated ATT MTU, the app chunks it; the firmware
  buffers writes until it parses as complete JSON (or use a length-prefixed first
  write). Finalize the chunking detail in A3.

### `command` (Write) — UTF-8 string
| Value | Effect |
|---|---|
| `activate` | Stop BLE, connect to WiFi with the provisioned creds, run the existing `activateDevice(claimingToken)`, report via `status`. |
| `cancel` | Abort setup, clear the buffered provision payload. |

### `status` (Read + Notify) — UTF-8 enum
The firmware notifies on every transition; the app drives its progress UI from it.

| Value | Meaning |
|---|---|
| `IDLE` | Advertising, awaiting provision |
| `RECEIVED` | Provision payload buffered and parsed OK |
| `WIFI_CONNECTING` | Joining the given WiFi |
| `ACTIVATING` | `POST /api/devices/activate` in flight |
| `ACTIVATED` | Success — `apiKey`/`webhookUrl` persisted to NVS; device will proceed to normal operation |
| `ERR_WIFI` | WiFi join failed (bad SSID/password/range) |
| `ERR_TOKEN` | Backend rejected the claiming token (invalid/expired/used) |
| `ERR_NET` | Could not reach the activation endpoint |
| `ERR_INTERNAL` | Unexpected device error |

On any `ERR_*` the device returns to `IDLE` and keeps advertising (never stranded).

## Happy-path sequence

```
app                              sensor (setup mode)
 │  scan (filter: setup service)  │  advertising IotPilot-Setup-XXXX
 │ ───────────────────────────── ▶│
 │  connect + (bond/encrypt)       │
 │ ───────────────────────────── ▶│
 │  read device-info               │
 │ ◀───────────────────────────── │  {deviceId, model, fw}
 │  (app fetches token for deviceId from backend)
 │  write provision {ssid,pwd,token}
 │ ───────────────────────────── ▶│  status → RECEIVED
 │  write command "activate"       │
 │ ───────────────────────────── ▶│  status → WIFI_CONNECTING → ACTIVATING
 │  notify status                  │
 │ ◀───────────────────────────── │  status → ACTIVATED
 │  (app reconciles device list → ONLINE via device:update socket)
```

## Notes for implementers

- **C3 must be built with `PartitionScheme=min_spiffs`** (Q2) — NimBLE doesn't fit
  the default partition.
- Single-radio C3: BLE and WiFi don't run concurrently — on `activate`, stop/deinit
  BLE before bringing up WiFi (Q5). After `ERR_*`, re-init BLE to resume `IDLE`.
- Reuse the existing `activateDevice()` and NVS persistence unchanged; this contract
  only changes how `{ssid, password, claimingToken}` reach the device.
- Keep the UUIDs and `status` enum in sync between firmware and
  `BleProvisioningService`; this doc is the single source of truth.
