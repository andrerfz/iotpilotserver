# IoT Device API Endpoints

## Overview

The IoT API provides dedicated endpoints for device-to-server communication. These endpoints are separate from user-facing UI endpoints to maintain clear separation of concerns and different authentication mechanisms.

## Endpoint Structure

```
/api/iot/*        → IoT device endpoints (API key authentication)
/api/devices/*    → User UI endpoints (session authentication)
```

## Authentication

IoT endpoints use **API Key authentication** via the `X-API-Key` header:

```bash
curl -H "X-API-Key: local-abc123..." https://iotpilot.app/api/iot/register
```

## Endpoints

### 1. Device Registration

**Endpoint:** `POST /api/iot/register`  
**Authentication:** API Key (required)  
**Purpose:** Self-registration for IoT devices

**Request:**
```bash
curl -X POST https://iotpilot.app/api/iot/register \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "pi-001",
    "hostname": "RaspberryPi-001",
    "device_type": "GENERIC",
    "device_model": "Raspberry Pi 4",
    "architecture": "aarch64",
    "location": "office-lab",
    "ip_address": "192.168.1.100",
    "mac_address": "b8:27:eb:xx:xx:xx",
    "auto_registered": true,
    "enhanced_specs": {
      "cpu_model": "ARM Cortex-A72",
      "total_memory_mb": 8192,
      "monitoring_version": "2.0.0-enhanced"
    }
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "id": "pi-001",
    "deviceId": "pi-001",
    "hostname": "RaspberryPi-001",
    "deviceType": "GENERIC",
    "status": "ONLINE",
    "autoRegistered": true,
    "registeredAt": "2026-01-23T02:00:00.000Z",
    "owner": {
      "id": "user-123",
      "email": "user@example.com"
    },
    "customer": {
      "id": "customer-456"
    },
    "enhancedMonitoring": true
  },
  "registrationId": "pi-001",
  "timestamp": "2026-01-23T02:00:00.000Z"
}
```

**Notes:**
- If device already exists, returns 200 OK (not an error for IoT devices)
- Device owner is automatically set to the API key owner
- Customer is inherited from the API key owner

---

### 2. Device Heartbeat

**Endpoint:** `POST /api/iot/heartbeat`  
**Authentication:** API Key (required)  
**Purpose:** Send periodic device status updates

**Request:**
```bash
curl -X POST https://iotpilot.app/api/iot/heartbeat \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "pi-001",
    "hostname": "RaspberryPi-001",
    "uptime": "up 5 days, 3 hours",
    "load_average": "0.15, 0.20, 0.18",
    "cpu_usage": 23.5,
    "cpu_temperature": 45.2,
    "memory_usage_percent": 65.3,
    "memory_used_mb": 5300,
    "memory_total_mb": 8192,
    "disk_usage_percent": 48,
    "disk_used": "45G",
    "disk_total": "96G",
    "app_status": "RUNNING",
    "agent_version": "2.0.0-enhanced",
    "last_boot": "2026-01-18 14:30:00",
    "timestamp": "2026-01-23T02:00:00+00:00",
    "ip_address": "192.168.1.100"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "success",
  "message": "Heartbeat received",
  "device": {
    "id": "pi-001",
    "status": "ONLINE",
    "lastSeen": "2026-01-23T02:00:00.000Z"
  }
}
```

**Notes:**
- Must be called at least every 5 minutes to keep device status as ONLINE
- Metrics are also sent to InfluxDB for time-series analysis
- Device must be registered before sending heartbeats

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "API key required for device registration",
  "code": "UNAUTHORIZED",
  "timestamp": "2026-01-23T02:00:00.000Z"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "API key user must belong to a customer",
  "code": "FORBIDDEN",
  "timestamp": "2026-01-23T02:00:00.000Z"
}
```

### 404 Not Found (Heartbeat only)
```json
{
  "success": false,
  "error": "Device not found. Please register the device first.",
  "code": "NOT_FOUND",
  "timestamp": "2026-01-23T02:00:00.000Z"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid device registration data",
  "code": "BAD_REQUEST",
  "details": [
    {
      "field": "device_id",
      "message": "Device ID is required"
    }
  ],
  "timestamp": "2026-01-23T02:00:00.000Z"
}
```

---

## Device Agent Script

The official device agent script automatically uses these endpoints:

```bash
curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-quick-test-local.sh | \
  DEVICE_ID="my-device" \
  DEVICE_NAME="My Device" \
  DEVICE_API_KEY="your-api-key" \
  IOTPILOT_SERVER="iotpilot-server-app:3000" \
  bash
```

The script will:
1. Register the device using `/api/iot/register`
2. Send initial heartbeat using `/api/iot/heartbeat`
3. Set up cron job to send heartbeats every 2 minutes

---

## Comparison with UI Endpoints

| Feature | IoT Endpoints (`/api/iot/*`) | UI Endpoints (`/api/devices/*`) |
|---------|------------------------------|----------------------------------|
| Authentication | API Key | User Session (JWT) |
| Purpose | Device self-registration | Manual device management |
| Rate Limits | Moderate (device operations) | Standard (user operations) |
| Response Format | Device-friendly JSON | UI-friendly JSON with pagination |
| Idempotency | Yes (registration returns 200 if exists) | No (registration fails if exists) |

---

## Best Practices

1. **API Key Security**: Store API keys securely on devices, never commit to version control
2. **Heartbeat Frequency**: Send heartbeats every 2-5 minutes for optimal monitoring
3. **Error Handling**: Implement exponential backoff on failures
4. **Network Resilience**: Queue heartbeats when offline, send when connection restored
5. **Enhanced Specs**: Include `enhanced_specs` for richer device information

---

## Rate Limits

- Registration: 10 requests per hour per device
- Heartbeat: 60 requests per hour per device (1 per minute)
- Burst: 5 requests in 10 seconds

Exceeding rate limits returns `429 Too Many Requests`.

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/andrerfz/iotpilotserver/issues
- Documentation: https://github.com/andrerfz/iotpilotserver/docs
