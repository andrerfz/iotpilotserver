# 🔌 IoT Pilot Complete API Reference

## Base URLs

- **Local Dev**: `http://localhost:3001/api`
- **Local SSL**: `https://iotpilotserver.test:9443/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

- **JWT Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <api_key>` or `Authorization: ApiKey <api_key>`

---

## 🏥 Health & Status

### GET /api/health

**Description**: System health check  
**Auth**: None required  
**Parameters**: None

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-06-12T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "database": "connected",
  "devices": {
    "total": 5,
    "online": 3,
    "offline": 2
  },
  "memory": {
    "used": 128,
    "total": 256,
    "external": 32
  },
  "services": {
    "influxdb": "healthy",
    "redis": "healthy",
    "grafana": "healthy"
  }
}
```

---

## 🔐 Authentication

### POST /api/auth/login

**Description**: User login  
**Auth**: None required

**Body Parameters**:

```json
{
  "email": "string (required) - User email",
  "password": "string (required) - User password", 
  "remember": "boolean (optional) - Extend session to 7 days"
}
```

**Response**:

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "username": "string", 
    "role": "ADMIN|USER|READONLY"
  },
  "token": "string"
}
```

### POST /api/auth/logout

**Description**: User logout  
**Auth**: JWT required  
**Parameters**: None

**Response**:

```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/me

**Description**: Get current user info  
**Auth**: JWT required  
**Parameters**: None

**Response**:

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "role": "ADMIN|USER|READONLY",
    "createdAt": "string",
    "_count": {
      "devices": "number",
      "alerts": "number"
    }
  }
}
```

### GET /api/auth/api-keys

**Description**: List user's API keys  
**Auth**: JWT required  
**Parameters**: None

**Response**:

```json
{
  "apiKeys": [
    {
      "id": "string",
      "name": "string",
      "key": "string (masked: ****abcd)",
      "lastUsed": "string|null",
      "expiresAt": "string|null",
      "createdAt": "string"
    }
  ]
}
```

### POST /api/auth/api-keys

**Description**: Create new API key  
**Auth**: JWT required

**Body Parameters**:

```json
{
  "name": "string (required, 1-100 chars) - API key name",
  "expiresAt": "string (optional) - ISO datetime for expiration"
}
```

**Response**:

```json
{
  "apiKey": {
    "id": "string",
    "name": "string",
    "key": "string (full key - only shown once)",
    "expiresAt": "string|null",
    "createdAt": "string"
  },
  "message": "API key created successfully. Save it securely - you won't see it again."
}
```

### DELETE /api/auth/api-keys

**Description**: Delete API key  
**Auth**: JWT required

**Query Parameters**:

- `id` (required): API key ID to delete

**Response**:

```json
{
  "message": "API key deleted successfully"
}
```

---

## 📱 Device Management

### GET /api/devices

**Description**: List all devices  
**Auth**: JWT required

**Query Parameters**:

- `status` (optional): Filter by status (`ONLINE|OFFLINE|MAINTENANCE|ERROR`)
- `limit` (optional): Number of devices to return (default: 50, max: 100)

**Response**:

```json
{
  "devices": [
    {
      "id": "string",
      "deviceId": "string",
      "hostname": "string",
      "deviceType": "PI_ZERO|PI_3|PI_4|PI_5|ORANGE_PI|GENERIC|UNKNOWN",
      "deviceModel": "string|null",
      "architecture": "string",
      "location": "string|null",
      "description": "string|null",
      "ipAddress": "string|null",
      "tailscaleIp": "string|null",
      "macAddress": "string|null",
      "status": "ONLINE|OFFLINE|MAINTENANCE|ERROR",
      "lastSeen": "string|null",
      "lastBoot": "string|null",
      "uptime": "string|null",
      "cpuUsage": "number|null",
      "cpuTemp": "number|null",
      "memoryUsage": "number|null",
      "memoryTotal": "number|null",
      "diskUsage": "number|null",
      "diskTotal": "string|null",
      "loadAverage": "string|null",
      "appStatus": "RUNNING|STOPPED|ERROR|NOT_INSTALLED|UNKNOWN",
      "agentVersion": "string|null",
      "userId": "string|null",
      "registeredAt": "string",
      "updatedAt": "string",
      "alertCount": "number"
    }
  ],
  "stats": {
    "total": "number",
    "online": "number", 
    "offline": "number",
    "maintenance": "number",
    "error": "number"
  }
}
```

### POST /api/devices

**Description**: Register new device  
**Auth**: API Key or JWT required

**Body Parameters**:

```json
{
  "device_id": "string (required) - Unique device identifier",
  "hostname": "string (required) - Device hostname", 
  "device_type": "string (required) - Device type",
  "device_model": "string (optional) - Device model",
  "architecture": "string (required) - CPU architecture",
  "location": "string (optional) - Physical location",
  "ip_address": "string (optional) - IP address",
  "tailscale_ip": "string (optional) - Tailscale IP",
  "mac_address": "string (optional) - MAC address"
}
```

**Response**:

```json
{
  "device": {
    "id": "string",
    "deviceId": "string",
    "hostname": "string",
    "deviceType": "string",
    "deviceModel": "string|null",
    "architecture": "string",
    "location": "string|null",
    "ipAddress": "string|null", 
    "tailscaleIp": "string|null",
    "macAddress": "string|null",
    "status": "ONLINE",
    "lastSeen": "string",
    "registeredAt": "string",
    "userId": "string"
  },
  "message": "Device registered successfully",
  "action": "created|updated"
}
```

### POST /api/devices/tailscale-register

**Description**: Register device with Tailscale metadata  
**Auth**: API Key required

**Headers**:

- `X-Tailscale-User`: Tailscale user
- `X-Tailscale-Name`: Tailscale device name
- `X-Tailscale-Login`: Tailscale login
- `X-Tailscale-Tailnet`: Tailscale tailnet

**Body Parameters**: Same as `/api/devices` plus:

```json
{
  "tailscale_user": "string (from header)",
  "tailscale_name": "string (from header)",
  "tailscale_login": "string (from header)",
  "tailscale_tailnet": "string (from header)"
}
```

**Response**:

```json
{
  "success": true,
  "device": { /* device object */ },
  "tailscale": {
    "user": "string",
    "name": "string", 
    "ip": "string"
  }
}
```

### POST /api/heartbeat

**Description**: Device heartbeat with metrics  
**Auth**: API Key required

**Body Parameters**:

```json
{
  "device_id": "string (required) - Device ID",
  "hostname": "string (required) - Device hostname",
  "uptime": "string (optional) - System uptime",
  "load_average": "string (optional) - Load average",
  "cpu_usage": "number (optional) - CPU usage %",
  "cpu_temperature": "number (optional) - CPU temp °C",
  "memory_usage_percent": "number (optional) - Memory usage %",
  "memory_used_mb": "number (optional) - Memory used MB",
  "memory_total_mb": "number (optional) - Total memory MB",
  "disk_usage_percent": "number (optional) - Disk usage %",
  "disk_used": "string (optional) - Disk used",
  "disk_total": "string (optional) - Total disk",
  "app_status": "RUNNING|STOPPED|ERROR|NOT_INSTALLED|UNKNOWN (optional)",
  "agent_version": "string (optional) - Agent version",
  "last_boot": "string (optional) - Last boot time",
  "timestamp": "string (optional) - Current timestamp",
  "ip_address": "string (optional) - IP address",
  "tailscale_ip": "string (optional) - Tailscale IP"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Heartbeat received",
  "device": {
    "id": "string",
    "status": "ONLINE",
    "lastSeen": "string"
  }
}
```

### GET /api/devices/[id]

**Description**: Get device details  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Response**:

```json
{
  "id": "string",
  "deviceId": "string",
  "hostname": "string",
  "deviceType": "string",
  "deviceModel": "string|null",
  "architecture": "string",
  "location": "string|null",
  "description": "string|null",
  "ipAddress": "string|null",
  "tailscaleIp": "string|null",
  "macAddress": "string|null",
  "status": "string",
  "lastSeen": "string|null",
  "lastBoot": "string|null",
  "uptime": "string|null",
  "cpuUsage": "number|null",
  "cpuTemp": "number|null",
  "memoryUsage": "number|null",
  "memoryTotal": "number|null", 
  "diskUsage": "number|null",
  "diskTotal": "string|null",
  "loadAverage": "string|null",
  "appStatus": "string",
  "agentVersion": "string|null",
  "userId": "string|null",
  "registeredAt": "string",
  "updatedAt": "string",
  "alertCount": "number",
  "metrics": {
    "cpu_usage": [
      {
        "timestamp": "string",
        "value": "number",
        "unit": "string|null"
      }
    ]
  },
  "alerts": [
    {
      "id": "string",
      "type": "string",
      "severity": "string",
      "title": "string", 
      "message": "string",
      "resolved": "boolean",
      "createdAt": "string"
    }
  ],
  "commands": [
    {
      "id": "string",
      "command": "string",
      "status": "string",
      "createdAt": "string"
    }
  ]
}
```

### PUT /api/devices/[id]

**Description**: Update device information  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Body Parameters**:

```json
{
  "hostname": "string (optional) - Device hostname",
  "location": "string (optional) - Physical location", 
  "description": "string (optional) - Device description",
  "status": "ONLINE|OFFLINE|MAINTENANCE|ERROR (optional) - Device status"
}
```

**Response**:

```json
{
  "device": { /* updated device object */ },
  "message": "Device updated successfully"
}
```

### DELETE /api/devices/[id]

**Description**: Delete a device  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Response**:

```json
{
  "message": "Device deleted successfully"
}
```

### GET /api/devices/[id]/metrics

**Description**: Get device metrics  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Query Parameters**:

- `metric` (optional): Specific metric (`cpu_usage|memory_usage|cpu_temperature|disk_usage` or `all`)
- `period` (optional): Time period (`1h|6h|24h|7d|30d`, default: `24h`)
- `resolution` (optional): Data resolution (`auto|raw|minute|hour|day`, default: `auto`)

**Response**:

```json
{
  "metrics": {
    "cpu_usage": [
      {
        "timestamp": "string",
        "value": "number",
        "unit": "string|null"
      }
    ],
    "memory_usage": [
      {
        "timestamp": "string", 
        "value": "number",
        "unit": "string|null"
      }
    ]
  },
  "period": "string",
  "resolution": "string",
  "total_points": "number",
  "processed_points": "number"
}
```

### GET /api/devices/[id]/commands

**Description**: List device commands  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Query Parameters**:

- `limit` (optional): Number of commands to return (default: 10)

**Response**:

```json
{
  "commands": [
    {
      "id": "string",
      "deviceId": "string",
      "command": "string",
      "arguments": "string|null",
      "status": "PENDING|RUNNING|COMPLETED|FAILED|TIMEOUT",
      "output": "string|null",
      "error": "string|null",
      "exitCode": "number|null",
      "executedAt": "string|null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### POST /api/devices/[id]/commands

**Description**: Issue a new command to a device  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID

**Body Parameters**:

```json
{
  "command": "string (required) - Command type (RESTART|SHUTDOWN|UPDATE|CUSTOM|REBOOT|INSTALL|UNINSTALL)",
  "arguments": "string (optional) - Command arguments"
}
```

**Response**:

```json
{
  "command": {
    "id": "string",
    "deviceId": "string",
    "command": "string",
    "arguments": "string|null",
    "status": "PENDING",
    "createdAt": "string"
  },
  "message": "Command issued successfully"
}
```

### GET /api/devices/[id]/commands/[commandId]

**Description**: Get command details  
**Auth**: JWT required

**Path Parameters**:

- `id` (required): Device ID
- `commandId` (required): Command ID

**Response**:

```json
{
  "command": {
    "id": "string",
    "deviceId": "string", 
    "command": "string",
    "arguments": "string|null",
    "status": "PENDING|RUNNING|COMPLETED|FAILED|TIMEOUT",
    "output": "string|null",
    "error": "string|null",
    "exitCode": "number|null",
    "executedAt": "string|null",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["field_name"],
      "message": "Expected string, received number"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 409 Conflict

```json
{
  "error": "Device already registered by another user",
  "action": "duplicate_rejected",
  "existing_owner": true
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

### 503 Service Unavailable

```json
{
  "error": "Service temporarily unavailable"
}
```

---

## Rate Limiting

- **API Endpoints**: 100 requests per 15 minutes (production), 1000 requests per 15 minutes (development)
- **Auth Endpoints**: No rate limiting
- **Tailscale Authenticated**: Rate limiting bypassed

**Rate Limit Headers**:

- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

---

## Testing Examples

### cURL Examples

**Health Check**:

```bash
curl -f http://localhost:3001/api/health
```

**Login**:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iotpilot.local","password":"admin"}'
```

**List Devices**:

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/devices?status=ONLINE&limit=10
```

**Device Heartbeat**:

```bash
curl -H "X-API-Key: $DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/heartbeat \
  -d '{"device_id":"test-device","hostname":"test","cpu_usage":45.7}'
```

**Register Device**:

```bash
curl -H "X-API-Key: $DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/devices \
  -d '{"device_id":"pi-001","hostname":"sensor-pi","device_type":"PI_4","architecture":"arm64"}'
```

**Get Device Metrics**:

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3001/api/devices/device-id/metrics?metric=cpu_usage&period=24h&resolution=hour"
```

**Issue Device Command**:

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/devices/device-id/commands \
  -d '{"command":"RESTART"}'
```