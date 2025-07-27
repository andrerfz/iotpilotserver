# Hub/Concentrator Provisioning Flow

## Overview

This document defines the provisioning flow for **IoT Hub devices** (iotpilot running on Raspberry Pi). This is different from simple IoT sensors (ESP8266) which use the claiming flow documented in `DEVICE_CLAIMING_FLOW.md`.

## Hub vs Sensor: Key Differences

| Aspect | Simple Sensor (ESP8266) | Hub/Concentrator (Raspberry Pi) |
|--------|------------------------|----------------------------------|
| **Purpose** | Single-purpose device (temperature, humidity) | Multi-device manager with local UI |
| **Complexity** | Simple firmware, no UI | Full Linux OS, web interface |
| **Device Count** | 1 sensor = 1 device | 1 hub = N managed devices |
| **Network** | WiFi only | WiFi/Ethernet/LTE |
| **Provisioning** | QR + WiFi captive portal | ??? (TO BE DEFINED) |

## Current State (Problema Actual)

### What We Have Now
```bash
# iotpilot/.env
DEVICE_API_KEY=local-kCs945S6Lq11CNTRL-28USAxy6dUQXxPrpq-u9ruoL  # Hardcoded
IOTPILOT_SERVER=iotpilot-server-app:3000
DEVICE_ID=test-device-docker
```

### The Problem
1. ❌ **customer_id is hardcoded** in the backend's API key seed data
2. ❌ **No real provisioning flow** - just hardcoded .env values
3. ❌ **Not scalable** - each hub needs manual configuration
4. ❌ **No tenant association** - hub doesn't know which customer it belongs to

## Proposed Solutions

### Option 1: Pre-Provisioned API Key (Simple, for MVP)

**Best for**: Quick testing, small deployments, trusted environments

**Flow**:
```
1. Admin logs into iotpilotserver UI
2. Admin creates API key for their customer account
   → customerId is automatically associated
3. Admin copies API key
4. Admin configures hub's .env file:
   DEVICE_API_KEY=<copied-key>
5. Hub starts, registers with that API key
   → customerId is inherited from API key
```

**Pros**:
- ✅ Simple implementation
- ✅ Works today with minimal changes
- ✅ Good for testing/development

**Cons**:
- ❌ Manual configuration required
- ❌ Not suitable for large deployments
- ❌ API key exposed in .env file

---

### Option 2: OAuth-like Login Flow (Recommended for Production)

**Best for**: Production deployments, self-service onboarding

**Flow**:
```
1. Customer buys/receives Raspberry Pi with iotpilot pre-installed
2. Customer powers on hub → iotpilot starts
3. Hub detects no credentials → Shows login screen
4. Customer enters their iotpilotserver credentials
5. Hub sends: POST /api/auth/hub-login
   {
     "email": "user@company.com",
     "password": "***",
     "hubId": "generated-unique-id"
   }
6. Backend validates credentials
7. Backend creates/retrieves API key for that user's customer
8. Backend returns:
   {
     "apiKey": "iotp_hub_abc123...",
     "customerId": "uuid",
     "serverUrl": "https://iotpilot.app"
   }
9. Hub stores credentials securely (encrypted file, not .env)
10. Hub registers itself: POST /api/iot/register
11. Hub is now online and associated with customer
```

**Pros**:
- ✅ Self-service (no admin intervention)
- ✅ Secure (credentials not in plain text .env)
- ✅ Scalable (works for 1 or 10,000 hubs)
- ✅ Standard pattern (like Particle, Arduino Cloud)

**Cons**:
- ⚠️ Requires UI changes in iotpilot
- ⚠️ Requires new backend endpoint `/api/auth/hub-login`
- ⚠️ More complex implementation

---

### Option 3: Provisioning Token (QR Code)

**Best for**: Physical distribution, retail sales, resellers

**Flow**:
```
1. Admin generates provisioning token in iotpilotserver UI
   → Token contains: customerId, expiresAt, scope
2. Admin prints QR code or writes token on card
3. Hub boots → Shows provisioning screen
4. Customer scans QR or enters token manually
5. Hub sends: POST /api/hub/provision
   {
     "provisioningToken": "ABC123...",
     "hubId": "generated-unique-id"
   }
6. Backend validates token
7. Backend creates API key for that customer
8. Backend returns credentials (same as Option 2)
9. Hub registers and goes online
```

**Pros**:
- ✅ Great UX (scan QR)
- ✅ Works offline initially
- ✅ Good for resellers/distributors
- ✅ Token can be revoked before use

**Cons**:
- ⚠️ Requires QR generation UI in backend
- ⚠️ Requires QR scanning in iotpilot
- ⚠️ Token management complexity

---

## Recommended Approach: Hybrid (Option 1 → Option 2)

### Phase 1 (MVP - Now): Pre-Provisioned API Key
- Use Option 1 for development and testing
- Fix current issues:
  - ✅ Create proper seed customer with UUID
  - ✅ API key properly associated with customer
  - ✅ Hub can register with `/api/iot/register`

### Phase 2 (Production): Add OAuth Login
- Implement Option 2 for self-service onboarding
- Keep Option 1 for power users/testing

### Phase 3 (Scale): Add QR Provisioning
- Implement Option 3 for retail/distribution
- All 3 options available

---

## Required Backend Changes

### Immediate (for Option 1 to work):

1. **Fix seed data** ✅ (DONE - updated API key to use UUID customer)
```sql
-- Already done: API key now uses c09826bc-39e4-4084-8e32-7ba728268915
```

2. **Support non-UUID customer IDs** ✅ (DONE - added `CustomerId.createLenient()`)

3. **IoT registration endpoint** ✅ (DONE - `/api/iot/register`)

4. **IoT heartbeat endpoint** ✅ (DONE - `/api/iot/heartbeat`)

### Future (for Option 2):

1. **Create `/api/auth/hub-login` endpoint**
   - Authenticates user credentials
   - Creates/retrieves API key for hub
   - Returns API key + customer context

2. **API key management UI**
   - List API keys
   - Create new API key
   - Revoke API key
   - View API key usage

### Future (for Option 3):

1. **Create `/api/hub/provision` endpoint**
2. **Provisioning token generation UI**
3. **QR code generation**

---

## iotpilot Changes Required

### Immediate (for Option 1):
- ✅ Use `/api/iot/register` instead of `/api/devices`
- ✅ Use `/api/iot/heartbeat` instead of `/api/heartbeat`
- ⚠️ Handle 201/200 responses correctly

### Future (for Option 2):
- Add login screen when no credentials found
- Store credentials securely (not in .env)
- Implement credential refresh logic

### Future (for Option 3):
- Add QR scanner for provisioning tokens
- Add manual token entry form

---

## Security Considerations

### API Key Storage (iotpilot)
```bash
# ❌ BAD - Plain text in .env
DEVICE_API_KEY=iotp_abc123...

# ✅ GOOD - Encrypted config file
/etc/iotpilot/credentials.enc  # Encrypted with device-specific key
```

### API Key Format
```
iotp_hub_[32 random chars]       # Hub API keys
iotp_sensor_[32 random chars]    # Sensor API keys
iotp_device_[32 random chars]    # Generic device keys
```

### Rate Limiting
```
/api/iot/register   - 10 requests/hour per IP
/api/iot/heartbeat  - 60 requests/hour per device
/api/auth/hub-login - 5 requests/hour per IP
```

---

## Testing Plan

### Test Scenario 1: Fresh Hub with API Key
```bash
# 1. Generate API key in UI
# 2. Configure hub .env
# 3. Start hub
# 4. Verify hub registers successfully
# 5. Verify heartbeats work
# 6. Verify devices can be added
```

### Test Scenario 2: Hub Loses Credentials
```bash
# 1. Delete hub's stored credentials
# 2. Restart hub
# 3. Verify login screen appears
# 4. Re-login
# 5. Verify hub works again
```

### Test Scenario 3: Revoked API Key
```bash
# 1. Revoke API key in backend
# 2. Hub tries to heartbeat
# 3. Verify 401 response
# 4. Verify hub shows "re-login required" message
```

---

## Next Steps (Immediate)

1. ✅ **Test current changes**
   - Restart test device
   - Verify registration works
   - Verify heartbeats work

2. 📝 **Document current flow**
   - Update README
   - Add to API docs

3. 🎯 **Plan Phase 2** (Option 2 implementation)
   - Define `/api/auth/hub-login` spec
   - Design iotpilot login UI
   - Estimate effort

---

## Decision Needed

**Question for Product Owner**: Which option should we implement for production?

- [ ] Option 1 only (simple, manual configuration)
- [ ] Option 2 (OAuth login) - Recommended
- [ ] Option 3 (QR provisioning)
- [ ] All options (maximum flexibility)

**Impact on iotpilot project**:
- Option 1: Minimal changes (URL updates only)
- Option 2: Moderate changes (add login UI)
- Option 3: Significant changes (QR scanner + UI)

**Timeline**:
- Option 1: Ready now (testing needed)
- Option 2: 1-2 weeks development
- Option 3: 2-3 weeks development
