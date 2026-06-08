# IoT Device Provisioning Architecture

This document consolidates the complete device onboarding ecosystem for IoT Pilot, covering both sensor and hub provisioning, the mobile app, and firmware design.

---

## Device Types

| Aspect | Sensor (ESP8266) | Hub (Raspberry Pi) |
|--------|-----------------|-------------------|
| **Purpose** | Single-purpose (temperature, humidity) | Multi-device manager with local UI |
| **Network** | WiFi only | WiFi/Ethernet/LTE |
| **Provisioning** | QR + WiFi captive portal | API key / OAuth / QR token |
| **Power** | Battery (deep sleep) | Always-on (USB/PoE) |
| **Firmware** | Arduino (`esp8266-claiming-firmware.ino`) | Linux (iotpilot service) |

---

## 1. Sensor Claiming Flow (ESP8266)

### Four Phases

```
Manufacturing -> Customer Claims -> WiFi Setup -> Normal Operation
```

**Phase 1 - Manufacturing:**
- Pre-register devices in bulk: `node scripts/preregister-devices.js --count 100 --qr`
- Flash firmware with unique Device ID (`#define DEVICE_ID "IOT-AB3X-P9Y2"`)
- Print QR label, attach to device, ship

**Phase 2 - Customer Claims:**
1. Customer logs into IoT Pilot (web or mobile app)
2. Navigates to "Add Device", scans QR or enters Device ID
3. App calls `POST /api/devices/claim` with deviceId + deviceName
4. Backend validates device is UNCLAIMED, associates with customer
5. Returns claiming token (15min TTL, one-time use)

**Phase 3 - WiFi Setup:**
1. Customer powers on device -> starts AP mode (`IotPilot-Setup-XXXX`)
2. Customer connects phone, captive portal opens
3. Enters home WiFi credentials + claiming token
4. Device connects to WiFi, calls `POST /api/devices/activate`
5. Backend validates token, returns permanent API key + webhook URL
6. Device stores credentials in EEPROM, reboots

**Phase 4 - Normal Operation:**
- Wake from deep sleep every 60min (configurable)
- Read DS18B20 temperature sensor
- POST to webhook with API key auth (temperature, battery, RSSI)
- Backend stores in PostgreSQL + InfluxDB, checks alert thresholds
- Return to deep sleep (~20uA, battery life ~4 months with 60min interval)

### QR Code Format
```json
{ "type": "iotpilot_device", "deviceId": "IOT-AB3X-P9Y2", "claimUrl": "https://app.iotpilot.com/claim?id=IOT-AB3X-P9Y2" }
```

### Security
- API key per device (permanent, unique)
- Claiming token: 15min TTL, one-time use, 36^8 combinations
- Tenant isolation enforced on every request
- Rate limiting on all provisioning endpoints

### Battery Life by Reporting Interval

| Interval | Battery Life (700mAh) |
|----------|----------------------|
| 15 min | ~1 month |
| 60 min | ~4 months |
| 120 min | ~8 months |

---

## 2. Hub Provisioning Flow (Raspberry Pi)

Three options, implemented in phases:

### Option 1: Pre-Provisioned API Key (MVP - Current)
1. Admin creates API key in IoT Pilot web UI
2. Configures hub's `.env` with `DEVICE_API_KEY=<key>`
3. Hub starts, registers via `/api/iot/register`

**Status:** Working. Good for dev/testing. Not scalable.

### Option 2: OAuth-like Login (Recommended for Production)
1. Hub boots with no credentials -> shows login screen
2. Customer enters IoT Pilot credentials
3. Hub calls `POST /api/auth/hub-login`
4. Backend returns API key + customer context
5. Hub stores credentials encrypted (not plain `.env`)

**Status:** Planned. Requires new backend endpoint + iotpilot login UI.

### Option 3: QR Provisioning Token
1. Admin generates provisioning token in UI, prints QR
2. Hub boots -> shows provisioning screen
3. Customer scans QR or enters token
4. Hub calls `POST /api/hub/provision`, gets credentials

**Status:** Planned. Good for retail/reseller distribution.

### Phased Rollout
- **Phase 1 (Now):** Option 1 only
- **Phase 2:** Add Option 2 (self-service)
- **Phase 3:** Add Option 3 (retail/distribution)

---

## 3. Mobile App Plan (Expo React Native)

### Architecture: Monorepo with npm workspaces
```
iotpilotserver/
  apps/web/           # Next.js (current app/)
  apps/mobile/        # Expo React Native
  packages/shared/    # Shared types, API client, domain logic
```

### Core Screens
- **Login** - JWT authentication
- **Device List** - All devices with status, temperature, battery
- **QR Scanner** - Camera-based QR scanning for device claiming
- **Claim Device** - Enter name, execute claim, display claiming token + instructions
- **Device Detail** - Live temperature, metrics, device info

### Key Dependencies
`@react-navigation/native`, `expo-camera`, `@tanstack/react-query`, `zustand`, `axios`

### Estimated Effort: 5-7 hours
1. Monorepo restructure (1h)
2. Initialize Expo app (1h)
3. Implement claiming flow (2-3h)
4. Dev workflow + Makefile (30min)
5. Documentation (30min)
6. Testing + polish (1h)

### Impact on Current Project
Moving `app/` to `apps/web/` requires updating:
- Docker compose volume mounts
- Dockerfile WORKDIR/COPY paths
- Makefile paths
- Root `package.json` (add workspaces config)

---

## 4. Firmware Reference

The ESP8266 firmware lives at `docs/esp8266-claiming-firmware.ino` and implements:

- **EEPROM storage** for device config, API key, webhook URL
- **WiFiManager** captive portal with custom claiming token parameter
- **Device activation** via `POST /api/devices/activate` (validates claiming token)
- **DS18B20 temperature reading** + battery level monitoring
- **Deep sleep** with configurable reporting interval
- **HTTP webhook** for data transmission with Bearer token auth

### EEPROM Memory Map
| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | Configured flag (0xAA) |
| 1 | 64 | API Key |
| 65 | 128 | Webhook URL |
| 193 | 4 | Reporting interval (seconds) |

---

## 5. Backend Endpoints Summary

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/devices/claim` | Customer claims UNCLAIMED device | Done |
| `POST /api/devices/activate` | Device validates token, gets credentials | Done |
| `POST /api/webhook/temperature` | Device sends temperature readings | Done |
| `POST /api/iot/register` | Hub self-registration | Done |
| `POST /api/iot/heartbeat` | Hub heartbeat | Done |
| `POST /api/auth/hub-login` | Hub OAuth-like login | Planned |
| `POST /api/hub/provision` | Hub QR token provisioning | Planned |

### Rate Limiting
```
/api/iot/register    - 10 req/hour per IP
/api/iot/heartbeat   - 60 req/hour per device
/api/auth/hub-login  - 5 req/hour per IP
```

---

## 6. API Key Format Convention
```
iotp_hub_[32 chars]       # Hub API keys
iotp_sensor_[32 chars]    # Sensor API keys
iotp_device_[32 chars]    # Generic device keys
```

---

## Next Steps

1. Test sensor claiming flow end-to-end with real ESP8266
2. Build frontend "Add Device" page with QR scanner (web)
3. Implement `POST /api/auth/hub-login` for hub self-service onboarding
4. Evaluate mobile app monorepo restructure when ready to start mobile development
