# bc-notification — Domain Events

## NotificationDispatchedEvent

**Emitted by:** `DispatchNotificationHandler`

**When:** A `NotificationRecord` is created and its delivery job enqueued. Fires once per record, which means once per (channel, recipient) pair for a given source event.

**Payload:**
```typescript
{
  notificationRecordId: string;   // NotificationRecordId
  customerId: string;             // CustomerId
  userId: string | null;          // UserId — null for system notifications
  type: string;                   // NotificationType value
  channel: string;                // NotificationChannel value
  recipient: string;              // NotificationRecipient value (obfuscated in logs)
  sourceEventId: string;          // UUID of the triggering domain event
  sourceEntityId: string | null;  // UUID of the source entity (alert, device, etc.)
  occurredAt: string;             // ISO 8601 UTC
}
```

**Consumed by:**
- Audit logging infrastructure
- Analytics BC (future — notification funnel metrics)

---

## NotificationDeliveredEvent

**Emitted by:** `MarkNotificationDeliveredHandler`

**When:** A channel dispatcher confirms successful delivery.

**Payload:**
```typescript
{
  notificationRecordId: string;
  customerId: string;
  userId: string | null;
  channel: string;
  type: string;
  sourceEventId: string;
  deliveredAt: string;           // ISO 8601 UTC
  occurredAt: string;            // ISO 8601 UTC
}
```

**Consumed by:**
- Audit logging infrastructure
- *(Future) analytics BC for delivery rate tracking*

---

## NotificationFailedEvent

**Emitted by:** `MarkNotificationFailedHandler`

**When:** A `NotificationRecord` transitions to `FAILED` (retryable) or `DEAD` (exhausted). Fires on each failure.

**Payload:**
```typescript
{
  notificationRecordId: string;
  customerId: string;
  userId: string | null;
  channel: string;
  type: string;
  status: 'FAILED' | 'DEAD';      // Whether retries remain
  attemptCount: number;
  maxAttempts: number;
  errorMessage: string | null;
  sourceEventId: string;
  occurredAt: string;             // ISO 8601 UTC
}
```

**Consumed by:**
- Audit logging infrastructure
- *(Future) alerting on notification delivery failure rates*

---

## NotificationPreferenceUpdatedEvent

**Emitted by:** `UpdateNotificationPreferenceHandler`

**When:** A user creates, enables, disables, or updates the destination for a notification preference.

**Payload:**
```typescript
{
  notificationPreferenceId: string;
  customerId: string;
  userId: string;
  channel: string;
  notificationType: string;
  enabled: boolean;
  occurredAt: string;            // ISO 8601 UTC
}
```

**Note:** `destination` is intentionally excluded from the event payload to avoid leaking PII (email addresses, phone numbers, tokens) into the event bus.

**Consumed by:**
- Audit logging infrastructure

---

## Events consumed by bc-notification (inbound)

These are domain events emitted by other BCs that trigger notification dispatch. The notification BC subscribes to each via its event handlers in `application/event-handlers/`.

| Event | Source BC | Handler | NotificationType used |
|---|---|---|---|
| `AlertTriggeredEvent` | monitoring | `OnAlertTriggeredHandler` | `ALERT_TRIGGERED` |
| `AlertResolvedEvent` | monitoring | `OnAlertResolvedHandler` | `ALERT_RESOLVED` |
| `DeviceDisconnectedEvent` | device | `OnDeviceOfflineHandler` | `DEVICE_OFFLINE` |
| `DeviceConnectedEvent` | device | `OnDeviceOnlineHandler` | `DEVICE_ONLINE` |

Each handler calls `NotificationRoutingService` to resolve active preferences for the affected user(s), then issues one `DispatchNotification` command per active channel.

**Migration note:** `monitoring` BC currently owns `OnAlertTriggeredHandler` and dispatches Slack jobs directly. That handler must be removed from `monitoring` and re-implemented here once this BC is materialized. See **Q3** in open-questions.md.
