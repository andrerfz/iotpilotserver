# bc-device — Aggregates

## Aggregate root: Device

### Identity
- `DeviceId` — UUID VO (exists: `device/domain/value-objects/device-id.vo.ts`)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `DeviceId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| publicId | string | `DevicePublicId` | MISSING — slug exposed to clients, immutable after registration |
| deviceId | string | `DeviceHardwareId` | MISSING — hardware identifier (e.g. MAC, chip ID), unique globally |
| name / hostname | string | `DeviceName` | exists: 1–255 chars |
| deviceType | enum | `DeviceType` | exists: RASPBERRY_PI, ORANGE_PI, HELTEC_ESP32, etc. |
| deviceModel | string? | `DeviceModel` | MISSING — specific model within type (e.g. "Raspberry Pi 4 Model B") |
| status | enum | `DeviceStatus` | exists: ONLINE \| OFFLINE \| MAINTENANCE \| ERROR \| UNCLAIMED |
| ipAddress | string? | `IpAddress` | exists: IPv4/IPv6 |
| tailscaleIp | string? | `IpAddress` | exists VO, reused |
| macAddress | string? | `MacAddress` | exists: colon-separated hex |
| location | string? | `DeviceLocation` | MISSING — max 255 chars, free text |
| description | string? | `DeviceDescription` | MISSING — max 1000 chars |
| tags | string[] | `DeviceTag[]` | MISSING — each tag max 50 chars, max 20 tags per device |
| architecture | string? | `Architecture` | MISSING — enum: arm64 \| armv7 \| x86_64 |
| agentVersion | string? | `AgentVersion` | MISSING — semver string |
| sshCredentials | object? | `SshCredentials` | exists: host, port, username, privateKey |
| apiKey | string? | `ApiKeyValue` (user BC) | hashed; used by device to authenticate heartbeats |
| claimingToken | string? | `ClaimingToken` | MISSING — short-lived token for device claiming flow |
| claimingTokenExpiresAt | Date? | — | bare Date nullable; null when not in claiming state |
| lastSeen | Date? | — | bare Date nullable; updated on each heartbeat |
| registeredAt | Date | — | bare Date UTC; immutable |
| deletedAt | Date? | — | soft delete |

`bool` is the only allowed bare primitive. Every other field requires a named VO.

### Missing VOs (need creation)
| Field | VO to create | Constraints |
|---|---|---|
| publicId | `DevicePublicId` | UUID, immutable after registration |
| deviceId (hardware) | `DeviceHardwareId` | non-empty string, unique globally |
| deviceModel | `DeviceModel` | max 100 chars, nullable |
| location | `DeviceLocation` | max 255 chars, nullable |
| description | `DeviceDescription` | max 1000 chars, nullable |
| tags | `DeviceTag` | max 50 chars each, alphanumeric + hyphen |
| architecture | `Architecture` | enum: arm64 \| armv7 \| x86_64 \| unknown |
| agentVersion | `AgentVersion` | semver string pattern |
| claimingToken | `ClaimingToken` | 6-char uppercase alphanumeric |

### DeviceCommand sub-entity
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `DeviceCommandId` | MISSING |
| command | enum | `DeviceCommandType` | MISSING: REBOOT \| SHUTDOWN \| UPDATE \| RESTART \| CUSTOM |
| arguments | string? | `CommandArguments` | MISSING: max 2000 chars |
| status | enum | `DeviceCommandStatus` | MISSING: PENDING \| RUNNING \| COMPLETED \| FAILED \| TIMEOUT |
| output | string? | `CommandOutput` | MISSING: max 100 000 chars |
| error | string? | `CommandError` | MISSING: max 5 000 chars |
| exitCode | number? | `ExitCode` | MISSING: integer |
| executedAt | Date? | — | bare Date |
| createdAt | Date | — | bare Date |

### DeviceSettings sub-entity
Stores per-device configuration preferences (persisted to `device_settings` table or as device fields).

| Key | Type | VO | Constraints |
|---|---|---|---|
| reportingInterval | number | `ReportingIntervalSeconds` | MISSING: 60–86400 seconds |
| heartbeatInterval | number | `HeartbeatIntervalSeconds` | MISSING: 30–600 seconds |
| metricsEnabled | bool | — | bare bool allowed |
| cpuThreshold | number | `CpuThresholdPercent` | MISSING: 50–100 |
| memoryThreshold | number | `MemoryThresholdPercent` | MISSING: 50–100 |
| temperatureThreshold | number | `TemperatureThresholdCelsius` | MISSING: 40–100 |
| diskThreshold | number | `DiskThresholdPercent` | MISSING: 70–100 |
| sensorTempThreshold | number | `SensorTempThresholdCelsius` | MISSING: −30–50 |
| batteryThreshold | number | `BatteryThresholdPercent` | MISSING: 5–50 |
| networkMonitoring | bool | — | bare bool |
| autoUpdate | bool | — | bare bool |
| updateChannel | enum | `UpdateChannel` | MISSING: stable \| beta \| nightly |
| sshEnabled | bool | — | bare bool |
| apiKeyRotationDays | number | `ApiKeyRotationDays` | MISSING: 7–365; 365 = disabled |

### Status lifecycle
```
UNCLAIMED ──► ONLINE   (device activates with claiming token)
ONLINE    ──► OFFLINE  (heartbeat timeout > threshold)
ONLINE    ──► MAINTENANCE
MAINTENANCE ──► ONLINE (reactivate)
OFFLINE   ──► ONLINE   (heartbeat resumes)
ONLINE    ──► ERROR    (agent reports critical failure)
ERROR     ──► ONLINE   (agent recovers)
any       ──► deleted  (soft delete, terminal)
```

### Invariants
- [ ] A device's `deviceHardwareId` is globally unique (not just tenant-scoped)
- [ ] `claimingToken` is only valid when status is `UNCLAIMED` and `claimingTokenExpiresAt` is in the future
- [ ] SSH commands may only be issued to devices with `status = ONLINE` and `sshEnabled = true`
- [ ] `CUSTOM` commands require explicit user confirmation (policy, not domain invariant)
- [ ] `apiKeyRotationDays = 365` means rotation is disabled — no `isRotationEnabled` bool
- [ ] Sensor devices (ESP32, Heltec) do not have SSH — `sshEnabled` is always false for `isSensorDevice(type)`

### Domain services (existing)
- `SshConnectorService` — establishes SSH connections
- `DeviceRemoverService` — handles soft-delete cascade
- `CommandQueueService` (application) — manages PENDING command dispatch

### Policies (existing)
- `DeviceAccessiblePolicy` — can the user access this device?
- `SshAllowedPolicy` — is SSH permitted for this device?
- `MetricCollectionPolicy` — should metrics be collected?

### BC layout (current + additions)
```
packages/core/src/device/
├── domain/
│   ├── entities/device.entity.ts                         (exists)
│   ├── entities/device-command.entity.ts                 (exists)
│   ├── entities/device-metrics.entity.ts                 (exists)
│   ├── entities/ssh-session.entity.ts                    (exists)
│   ├── value-objects/device-id.vo.ts                     (exists)
│   ├── value-objects/device-name.vo.ts                   (exists)
│   ├── value-objects/device-status.vo.ts                 (exists)
│   ├── value-objects/device-type.vo.ts                   (exists)
│   ├── value-objects/ip-address.vo.ts                    (exists)
│   ├── value-objects/mac-address.vo.ts                   (exists)
│   ├── value-objects/ssh-credentials.vo.ts               (exists)
│   ├── value-objects/device-public-id.vo.ts              (MISSING)
│   ├── value-objects/device-hardware-id.vo.ts            (MISSING)
│   ├── value-objects/device-model.vo.ts                  (MISSING)
│   ├── value-objects/device-location.vo.ts               (MISSING)
│   ├── value-objects/device-description.vo.ts            (MISSING)
│   ├── value-objects/device-tag.vo.ts                    (MISSING)
│   ├── value-objects/architecture.vo.ts                  (MISSING)
│   ├── value-objects/agent-version.vo.ts                 (MISSING)
│   ├── value-objects/claiming-token.vo.ts                (MISSING)
│   ├── value-objects/device-command-type.vo.ts           (MISSING)
│   ├── value-objects/device-command-status.vo.ts         (MISSING)
│   ├── value-objects/reporting-interval-seconds.vo.ts    (MISSING)
│   ├── value-objects/heartbeat-interval-seconds.vo.ts    (MISSING)
│   ├── value-objects/api-key-rotation-days.vo.ts         (MISSING)
│   └── value-objects/update-channel.vo.ts                (MISSING)
└── application/
    ├── commands/rotate-api-key/                          (MISSING)
    └── queries/get-device-settings/                      (exists via router, MISSING in command bus)
```
