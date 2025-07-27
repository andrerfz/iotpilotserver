# IoT API Migration Guide

## Overview

The IoT device registration and heartbeat endpoints have been moved to a dedicated `/api/iot/*` namespace with API key authentication, separating device operations from user UI operations.

## What Changed

### Old Structure (Before)
```
POST /api/devices          → Required user session (401 for devices)
POST /api/heartbeat        → Accepted API keys ✅
```

### New Structure (After)
```
POST /api/iot/register     → API key authentication (devices)
POST /api/iot/heartbeat    → API key authentication (devices)
POST /api/devices          → User session (UI only)
POST /api/devices/register → User session (UI only)
```

## Files Changed

### Server (iotpilotserver)

1. **Created `/app/src/app/api/iot/register/route.ts`**
   - New endpoint for device self-registration
   - Accepts API key authentication via `X-API-Key` header
   - Returns device-friendly JSON responses
   - Handles "already exists" as success (idempotent for devices)

2. **Created `/app/src/app/api/iot/heartbeat/route.ts`**
   - Alias for `/api/heartbeat` to maintain consistency
   - All IoT endpoints now under `/api/iot/*` namespace

3. **Updated `/scripts/device-agent-quick-test-local.sh`**
   - Changed registration endpoint from `/api/devices` to `/api/iot/register`
   - Changed heartbeat endpoint from `/api/heartbeat` to `/api/iot/heartbeat`

### Documentation

4. **Created `/docs/IOT_API_ENDPOINTS.md`**
   - Complete reference for IoT device endpoints
   - Request/response examples
   - Error handling guide
   - Best practices

5. **Created `/docs/IOT_MIGRATION_GUIDE.md`** (this file)
   - Migration instructions
   - Breaking changes
   - Testing guide

## Breaking Changes

### For Device Scripts

**Old:**
```bash
curl -X POST "$SERVER_URL/api/devices" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d '{"device_id":"pi-001",...}'
```

**New:**
```bash
curl -X POST "$SERVER_URL/api/iot/register" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d '{"device_id":"pi-001",...}'
```

### For Heartbeats

**Old:**
```bash
curl -X POST "$SERVER_URL/api/heartbeat" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d '{"device_id":"pi-001",...}'
```

**New:**
```bash
curl -X POST "$SERVER_URL/api/iot/heartbeat" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d '{"device_id":"pi-001",...}'
```

**Note:** Old `/api/heartbeat` endpoint still works for backward compatibility.

## Migration Steps

### For Test Device (iotpilot project)

The test device uses the installation script from GitHub, which has been updated:

```bash
# Navigate to the test device project
cd /Users/andrerfz/Proyectos/iotpilot

# Stop and remove old test device
docker compose --profile test down

# Start fresh test device (will download updated script)
docker compose --profile test up test-device
```

The device will automatically:
1. Download the updated script from GitHub
2. Register using `/api/iot/register`
3. Send heartbeats using `/api/iot/heartbeat`

### For Production Devices

**Option 1: Update Script (Recommended)**
```bash
# Download and install updated agent
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-quick-test-local.sh | \
  DEVICE_ID="my-device" \
  DEVICE_API_KEY="your-api-key" \
  IOTPILOT_SERVER="iotpilot.app" \
  bash
```

**Option 2: Manual Update**
If you have custom scripts, update the URLs:
```bash
# In your custom script, replace:
-X POST "$SERVER_URL/api/devices" 
# with:
-X POST "$SERVER_URL/api/iot/register"

# And replace:
-X POST "$SERVER_URL/api/heartbeat"
# with:
-X POST "$SERVER_URL/api/iot/heartbeat"
```

## Testing the Migration

### 1. Test Server Health

```bash
curl http://iotpilot-server-app:3000/api/health
```

Expected: `{"success": true, "status": "healthy"}`

### 2. Test IoT Registration

```bash
curl -X POST http://iotpilot-server-app:3000/api/iot/register \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-001",
    "hostname": "Test Device",
    "device_type": "GENERIC"
  }'
```

Expected: `{"success": true, "message": "Device registered successfully"}`

### 3. Test IoT Heartbeat

```bash
curl -X POST http://iotpilot-server-app:3000/api/iot/heartbeat \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-001",
    "hostname": "Test Device",
    "cpu_usage": 25.5,
    "memory_usage_percent": 60.3
  }'
```

Expected: `{"success": true, "status": "success", "message": "Heartbeat received"}`

### 4. Test Test Device Container

```bash
# In the iotpilot project directory
cd /Users/andrerfz/Proyectos/iotpilot

# Check test device logs
docker compose --profile test logs test-device

# Should see:
# ✅ Enhanced device registered successfully
# ✅ Enhanced heartbeat successful
```

## Backward Compatibility

- `/api/heartbeat` still works (redirects internally to `/api/iot/heartbeat`)
- `/api/devices` will return 401 for API key authentication (expected)
- No changes to UI endpoints or user authentication

## Benefits of This Change

1. **Clear Separation**: Device operations vs UI operations
2. **Better Security**: Separate authentication mechanisms
3. **Easier Maintenance**: Device logic isolated from user logic
4. **Standard Practice**: Aligns with AWS IoT, Azure IoT Hub patterns
5. **Clearer API**: `/api/iot/*` namespace is self-documenting

## Rollback Plan

If issues arise, you can temporarily point devices back to old URLs:

```bash
# In device scripts, change back to:
POST "$SERVER_URL/api/heartbeat"  # This still works

# Note: Registration endpoint /api/devices won't work with API keys
# Devices must be pre-registered via UI if rollback is needed
```

## Support

- **Server Logs**: `make dev-logs` or `docker logs iotpilot-server-app`
- **Device Logs**: `docker logs iotpilot-test-device`
- **Documentation**: `/docs/IOT_API_ENDPOINTS.md`
- **Issues**: GitHub Issues

## Next Steps

1. ✅ Server endpoints created
2. ✅ Device script updated
3. ✅ Documentation added
4. ⏳ Test device registration (you're here)
5. ⏳ Monitor device heartbeats
6. ⏳ Update production devices
