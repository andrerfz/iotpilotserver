# bc-device — Domain Events

## Existing events (do not re-emit)

| Event | Emitted by | Consumers |
|---|---|---|
| `DeviceRegisteredEvent` | `RegisterDeviceHandler` | notification BC (welcome/setup notification) |
| `DeviceConnectedEvent` | `ProcessHeartbeatHandler` (OFFLINE→ONLINE) | notification BC, monitoring BC |
| `DeviceDisconnectedEvent` | `MarkStaleDevicesOfflineHandler` | notification BC (`DEVICE_OFFLINE` alert) |
| `DeviceActivatedEvent` | `ActivateDeviceHandler` | monitoring BC (start threshold evaluation) |
| `DeviceDeactivatedEvent` | `DeactivateDeviceHandler` | monitoring BC |
| `DeviceUpdatedEvent` | `UpdateDeviceHandler` | audit log |
| `DeviceRemovedEvent` | `RemoveDeviceHandler` | monitoring BC (cleanup alerts/thresholds) |
| `MetricsCollectedEvent` | `ProcessHeartbeatHandler` | monitoring BC (threshold evaluation) |
| `SshCommandExecutedEvent` | `ExecuteSshCommandHandler` | audit log |
| `SshSessionStartedEvent` | `ExecuteSshCommandHandler` | audit log |
| `SshSessionEndedEvent` | `ExecuteSshCommandHandler` | audit log |

---

## New events (need scaffolding)

### DeviceApiKeyRotatedEvent

**Emitted by:** `RotateApiKeyHandler`

**Payload:**
```typescript
{
  deviceId: string;
  customerId: string;
  rotatedBy: string;        // userId who triggered the rotation
  occurredAt: string;       // ISO 8601 UTC
}
```

**Consumed by:**
- audit log
- notification BC → send alert email to ADMIN that API key was rotated

**Note:** The new API key value is NOT included in the event payload (security). The device retrieves it via the provisioning flow.

---

### DeviceSettingsUpdatedEvent

**Emitted by:** `UpdateDeviceSettingsHandler`

**Payload:**
```typescript
{
  deviceId: string;
  customerId: string;
  updatedFields: string[];  // list of setting keys that changed
  occurredAt: string;
}
```

**Consumed by:**
- monitoring BC: if `cpuThreshold`, `memoryThreshold`, `temperatureThreshold`, or `diskThreshold` changed → sync to the corresponding `Threshold` records for this device
