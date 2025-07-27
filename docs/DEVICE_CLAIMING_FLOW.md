# IoT Device Claiming Flow - Complete Guide

## Overview

This document describes the **device claiming flow** for IoT Pilot temperature sensors. This approach is the industry-standard for IoT SaaS products and provides the optimal balance between **security** and **user experience**.

---

## 🎯 Why This Approach?

### ✅ Advantages

1. **Secure**: Only authorized devices with valid claiming tokens can send data
2. **Simple UX**: Customer just scans QR code and enters token in WiFi portal
3. **Scalable**: Pre-register thousands of devices at manufacturing
4. **Traceable**: Complete audit trail from manufacturing to customer
5. **Professional**: Same flow used by Particle, Arduino Cloud, Tuya Smart
6. **Multi-tenant Safe**: Each device belongs to exactly one customer

### ❌ Rejected Alternatives

**Option 1: Auto-registration (MAC-based)**
- ⚠️ Security risk: Anyone can impersonate a device
- ⚠️ Spam/abuse: No prevention of fake devices
- ⚠️ Poor claiming UX: How does user find their device?

**Option 2: Token pre-configuration**
- ⚠️ Poor UX: User must manually configure token
- ⚠️ Support burden: Configuration complexity
- ⚠️ Manufacturing complexity: Token provisioning logistics

---

## 📋 Complete Flow Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 1: MANUFACTURING                                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Generate unique Device IDs in bulk                           │
│     $ node scripts/preregister-devices.js --count 100 --qr      │
│                                                                   │
│  2. Pre-register devices in database (status: UNCLAIMED)        │
│     • Device ID: IOT-AB3X-P9Y2                                  │
│     • QR Code generated                                         │
│     • Label printed                                             │
│                                                                   │
│  3. Flash firmware with unique Device ID                        │
│     #define DEVICE_ID "IOT-AB3X-P9Y2"                          │
│                                                                   │
│  4. Attach QR code label + instructions card                    │
│                                                                   │
│  5. Ship to customer                                            │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 2: CUSTOMER CLAIMS DEVICE                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Customer logs into IotPilot web/mobile app                  │
│                                                                   │
│  2. Customer navigates to "Add Device"                          │
│                                                                   │
│  3. Customer scans QR code or enters Device ID manually         │
│     • Scan: IOT-AB3X-P9Y2                                      │
│     • Or type: IOT-AB3X-P9Y2                                   │
│                                                                   │
│  4. App calls: POST /api/devices/claim                         │
│     {                                                           │
│       "deviceId": "IOT-AB3X-P9Y2",                            │
│       "deviceName": "Living Room Sensor",                     │
│       "location": "Living Room"                               │
│     }                                                           │
│                                                                   │
│  5. Backend validates device exists and is UNCLAIMED            │
│                                                                   │
│  6. Backend associates device with customer account             │
│     • customerId: customer-uuid                                │
│     • ownerId: user-uuid                                       │
│     • status: PENDING_SETUP                                    │
│                                                                   │
│  7. Backend generates claiming token (15min TTL)                │
│     • claimingToken: "[EXAMPLE-TOKEN]"                          │
│     • Stored in device.metadata                                │
│                                                                   │
│  8. App displays claiming token to user                        │
│     ┌──────────────────────────────┐                           │
│     │  Device Claimed!             │                           │
│     │                              │                           │
│     │  Claiming Token:             │                           │
│     │  ┏━━━━━━━━━━━━┓             │                           │
│     │  ┃ [EXAMPLE-TOKEN] ┃         │                           │
│     │  ┗━━━━━━━━━━━━┛             │                           │
│     │                              │                           │
│     │  Enter this in WiFi setup   │                           │
│     │  portal (expires in 15min)  │                           │
│     └──────────────────────────────┘                           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 3: DEVICE SETUP (WiFi Configuration)                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Customer powers on device                                    │
│     • Device checks EEPROM for config                           │
│     • Config not found → Start AP mode                          │
│                                                                   │
│  2. Device starts WiFi Access Point                             │
│     • SSID: "IotPilot-Setup-[DEVICE-ID]"                        │
│     • Password: "[SETUP-PASSWORD]"                             │
│     • IP: 192.168.4.1                                          │
│                                                                   │
│  3. Customer connects phone to AP                               │
│     • Captive portal auto-opens                                │
│     • Or browse to 192.168.4.1                                 │
│                                                                   │
│  4. Captive portal displays configuration form                  │
│     ┌──────────────────────────────┐                           │
│     │  Configure Device            │                           │
│     │                              │                           │
│     │  WiFi SSID:                 │                           │
│     │  [MyHomeNetwork___]         │                           │
│     │                              │                           │
│     │  WiFi Password:             │                           │
│     │  [**************]           │                           │
│     │                              │                           │
│     │  Claiming Token:            │                           │
│     │  [AB3X-P9Y2______]         │                           │
│     │                              │                           │
│     │  [   Save & Activate   ]    │                           │
│     └──────────────────────────────┘                           │
│                                                                   │
│  5. Customer enters:                                            │
│     • Home WiFi SSID                                           │
│     • Home WiFi password                                       │
│     • Claiming token from app                                  │
│                                                                   │
│  6. Device saves WiFi credentials locally                       │
│                                                                   │
│  7. Device connects to home WiFi                                │
│                                                                   │
│  8. Device calls: POST /api/devices/activate                   │
│     {                                                           │
│       "deviceId": "IOT-AB3X-P9Y2",                            │
│       "claimingToken": "AB3X-P9Y2",                           │
│       "macAddress": "AA:BB:CC:DD:EE:FF",                      │
│       "ipAddress": "192.168.1.100"                            │
│     }                                                           │
│                                                                   │
│  9. Backend validates:                                          │
│     ✓ Device ID exists                                         │
│     ✓ Status is PENDING_SETUP                                 │
│     ✓ Claiming token matches                                   │
│     ✓ Token not expired                                        │
│                                                                   │
│ 10. Backend returns permanent API credentials:                  │
│     {                                                           │
│       "success": true,                                         │
│       "credentials": {                                         │
│         "apiKey": "iotp_device_abc123...",                   │
│         "webhookUrl": "https://.../webhook/temperature"      │
│       },                                                       │
│       "config": {                                             │
│         "reportingInterval": 60,                             │
│         "deepSleepEnabled": true                             │
│       }                                                       │
│     }                                                           │
│                                                                   │
│ 11. Device stores in EEPROM:                                    │
│     • API key (permanent)                                      │
│     • Webhook URL                                              │
│     • Reporting interval                                       │
│     • Deep sleep config                                        │
│                                                                   │
│ 12. Backend updates device:                                     │
│     • status: ONLINE                                           │
│     • Clear claiming token (one-time use)                      │
│     • Mark activatedAt timestamp                               │
│                                                                   │
│ 13. Device reboots into normal operation                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ PHASE 4: NORMAL OPERATION                                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────┐                    │
│  │ Every 60 minutes (configurable):        │                    │
│  ├─────────────────────────────────────────┤                    │
│  │                                         │                    │
│  │  1. Device wakes from deep sleep       │                    │
│  │     • Load config from EEPROM          │                    │
│  │     • Connect to WiFi                  │                    │
│  │                                         │                    │
│  │  2. Read temperature sensor            │                    │
│  │     • DS18B20: 22.5°C                 │                    │
│  │                                         │                    │
│  │  3. POST to webhook                    │                    │
│  │     Headers:                           │                    │
│  │       Authorization: Bearer iotp_...  │                    │
│  │     Body:                              │                    │
│  │       {                                │                    │
│  │         "deviceId": "IOT-AB3X-P9Y2",  │                    │
│  │         "temperature": 22.5,          │                    │
│  │         "unit": "celsius",            │                    │
│  │         "batteryLevel": 87,           │                    │
│  │         "rssi": -64                   │                    │
│  │       }                                │                    │
│  │                                         │                    │
│  │  4. Backend validates API key          │                    │
│  │     ✓ API key matches device          │                    │
│  │     ✓ Device belongs to customer      │                    │
│  │                                         │                    │
│  │  5. Backend stores data                │                    │
│  │     • PostgreSQL (latest reading)     │                    │
│  │     • InfluxDB (time-series)          │                    │
│  │                                         │                    │
│  │  6. Backend checks alert thresholds   │                    │
│  │     • Temp > 25°C? → Create alert     │                    │
│  │     • Temp < 15°C? → Create alert     │                    │
│  │                                         │                    │
│  │  7. Backend responds: { success: true }│                    │
│  │                                         │                    │
│  │  8. Device enters deep sleep           │                    │
│  │     • Current: ~20µA                  │                    │
│  │     • Battery life: 2-4 months        │                    │
│  │                                         │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### Device Authentication
- ✅ **API Key per device**: Unique, long, random API key
- ✅ **Claiming token**: Short-lived (15min), one-time use
- ✅ **Device ID**: Pre-registered in database, cannot be spoofed
- ✅ **Tenant isolation**: Device data scoped to customer account

### Attack Prevention
- ❌ **Fake devices**: Cannot register without valid claiming token
- ❌ **Token guessing**: 36^8 = 2.8 trillion combinations, 15min TTL
- ❌ **Replay attacks**: Claiming tokens are one-time use
- ❌ **Data injection**: API key validated on every request
- ❌ **Cross-tenant access**: Backend enforces tenant boundaries

---

## 🚀 Implementation Checklist

### Backend (Completed ✅)

- [x] **POST /api/devices/claim** - Customer claims device
- [x] **POST /api/devices/activate** - Device validates token & gets credentials
- [x] **POST /api/webhook/temperature** - Receive temperature data
- [x] Database migration for UNCLAIMED/PENDING_SETUP statuses
- [x] Manufacturing script: `scripts/preregister-devices.js`

### Frontend (TODO)

- [ ] **"Add Device" page** with QR scanner
- [ ] **Device claiming flow** UI
- [ ] **Display claiming token** to user
- [ ] **Setup instructions** modal/page
- [ ] **Device dashboard** showing temperature data
- [ ] **Alert configuration** UI

### Firmware (Completed ✅)

- [x] **WiFiManager** for captive portal
- [x] **Custom claiming token parameter**
- [x] **Device activation flow**
- [x] **EEPROM persistent storage**
- [x] **Deep sleep support**
- [x] **Temperature + battery monitoring**

---

## 📱 Mobile App Integration

### QR Code Format

```json
{
  "type": "iotpilot_device",
  "deviceId": "IOT-AB3X-P9Y2",
  "claimUrl": "https://app.iotpilot.com/claim?id=IOT-AB3X-P9Y2"
}
```

### React Native QR Scanner

```javascript
import { RNCamera } from 'react-native-camera';

function AddDeviceScreen() {
  const handleBarCodeRead = async ({ data }) => {
    try {
      const qrData = JSON.parse(data);

      if (qrData.type === 'iotpilot_device') {
        // Navigate to claim screen with deviceId
        navigation.navigate('ClaimDevice', {
          deviceId: qrData.deviceId
        });
      }
    } catch (error) {
      console.error('Invalid QR code');
    }
  };

  return (
    <RNCamera
      onBarCodeRead={handleBarCodeRead}
      barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
    />
  );
}
```

---

## 🏭 Manufacturing Workflow

### Step-by-Step Process

```bash
# 1. Pre-register devices (before manufacturing)
cd /path/to/iotpilotserver
docker exec iotpilot-server-app npm run device:preregister -- --count 100 --qr --batch PROD-2025-01

# Output:
# ✅ 100 devices pre-registered
# 📄 CSV: generated_devices/2025-01-15/devices.csv
# 📱 QR codes: generated_devices/2025-01-15/*.png

# 2. Flash firmware for each device
# Edit DEVICE_ID in esp8266-claiming-firmware.ino
# Upload via Arduino IDE or PlatformIO

# 3. Print labels
# - Device ID (human-readable): IOT-AB3X-P9Y2
# - QR code (from generated PNG)
# - Instructions: "Scan to claim your device"

# 4. Attach labels to devices

# 5. Quality check
# - Power on device
# - Check serial output
# - Verify AP mode starts
# - Test one full claiming flow

# 6. Package
# - Device + sensor
# - QR code label attached
# - Instructions card
# - USB cable + battery (optional)

# 7. Ship!
```

### Label Design

```
┌────────────────────────────────┐
│   IoTPilot Temperature Sensor  │
│                                │
│   [QR CODE]                    │
│                                │
│   Device ID: IOT-AB3X-P9Y2    │
│                                │
│   Scan to claim your device   │
│   → app.iotpilot.com/claim    │
└────────────────────────────────┘
```

---

## 📊 Battery Life Optimization

### Power Consumption

| Mode | Current | Duration | Energy |
|------|---------|----------|--------|
| Deep Sleep | 20µA | 59min 50sec | 0.02mAh |
| WiFi Active | 80mA | 10sec | 0.22mAh |
| **Total/hour** | | | **0.24mAh** |

### Battery Life Calculations

```
Battery: 16340 Li-ion = 700mAh
Usage: 0.24mAh per hour
Life: 700 / 0.24 = 2,916 hours = 121 days = 4 months
```

### Reporting Intervals

| Interval | Battery Life | Use Case |
|----------|--------------|----------|
| 15 min | 1 month | High-frequency monitoring |
| 30 min | 2 months | Standard monitoring |
| 60 min | 4 months | Long-term deployment |
| 120 min | 8 months | Low-priority sensors |

---

## 🎓 Customer Instructions Card

```
┌────────────────────────────────────────────────┐
│  IoTPilot Temperature Sensor - Quick Start     │
├────────────────────────────────────────────────┤
│                                                │
│  1. Download the IoTPilot app                 │
│     → iOS: App Store                          │
│     → Android: Play Store                     │
│     → Web: app.iotpilot.com                   │
│                                                │
│  2. Create account or log in                  │
│                                                │
│  3. Tap "Add Device" and scan QR code        │
│     (or enter Device ID manually)             │
│                                                │
│  4. Note your Claiming Token                  │
│     Example: AB3X-P9Y2                        │
│                                                │
│  5. Power on your sensor                      │
│     - Plug in USB cable or insert battery    │
│     - Wait 10 seconds                         │
│                                                │
│  6. Connect to WiFi: "IotPilot-Setup-XXXX"   │
│     Password: iotpilot123                     │
│                                                │
│  7. Browser opens automatically               │
│     - Enter your home WiFi name & password   │
│     - Enter Claiming Token from step 4       │
│     - Tap "Save"                              │
│                                                │
│  8. Done! Sensor will appear in your app     │
│                                                │
│  Need help? support@iotpilot.com             │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Device won't enter setup mode
- Check power supply
- Wait 30 seconds after power-on
- Look for "IotPilot-Setup-XXXX" WiFi network
- Reset: Unplug and replug power

### Claiming token expired
- Tokens expire after 15 minutes
- Re-claim device in app to get new token

### Device offline after setup
- Check home WiFi password was correct
- Verify WiFi signal strength where device is located
- Check device has power

### Data not appearing in app
- Wait 1-2 minutes for first reading
- Check device status in app (should show "Online")
- Verify temperature sensor is connected

---

## 🚦 Next Steps

1. **Apply database migration**:
   ```bash
   make apply-migration
   # Select: 003_device_claiming_support.sql
   ```

2. **Pre-register test devices**:
   ```bash
   docker exec iotpilot-server-app node scripts/preregister-devices.js --count 5 --qr
   ```

3. **Build frontend claiming UI** (React/React Native)

4. **Flash test device** with firmware

5. **End-to-end test** of claiming flow

6. **Document API** for mobile app developers

---

## 📚 API Reference

See individual endpoint files for detailed documentation:
- `/api/devices/claim` - Customer claims unclaimed device
- `/api/devices/activate` - Device validates token, gets credentials
- `/api/webhook/temperature` - Device sends temperature readings

---

## ✅ Summary

This claiming flow provides the **best balance** of:
- ✅ **Security**: API key authentication, one-time claiming tokens
- ✅ **UX**: Simple QR scan + WiFi setup, no manual token entry needed
- ✅ **Scalability**: Pre-register thousands of devices
- ✅ **Professionalism**: Industry-standard approach

You're now ready to build a production IoT product! 🚀
