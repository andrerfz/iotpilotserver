# bc-notification — Domain Events

> **Status: ✅ Implemented.** Event classes live in `packages/core/src/notification/domain/events/`. The inbound subscriptions and outbound publishers described below match the wiring in `packages/core/src/shared/infrastructure/container/service-container.ts`.

## NotificationDispatchedEvent

**Emitted by:** `DispatchNotificationHandler` (initial dispatch) and `RetryNotificationHandler` (re-queue of a FAILED/DEAD record).

**When:** A `NotificationRecord` is created (or retried) and its delivery job enqueued. Fires once per record, which means once per (channel, recipient) pair for a given source event.

**Payload** (`notification-dispatched.event.ts`):
```typescript
{
  notificationRecordId: string;   // NotificationRecordId
  customerId: string;             // CustomerId
  userId: string | null;          // UserId — null for system notifications
  type: string;                   // NotificationType value
  channel: string;                // NotificationChannel value
  sourceEventId: string;          // UUID of the triggering domain event
  sourceEntityId: string | null;  // UUID of the source entity (alert, device, etc.)
  occurredAt: string;             // ISO 8601 UTC (from DomainEventBase)
}
```

`recipient` is deliberately **not** on the payload — it can carry PII (email/phone/token) and is read from the persisted `NotificationRecord` by the channel processor instead.

**Consumed by:**
- `OnNotificationDispatchedHandler` (in this BC) — enqueues the `dispatch-notification-channel` job onto the `JobQueue` for actual channel delivery.
- Audit logging infrastructure

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

These are domain events emitted by other BCs that trigger notification dispatch. The notification BC subscribes to each via its event handlers in `packages/core/src/notification/application/event-handlers/`. Subscriptions are registered in `packages/core/src/shared/infrastructure/container/service-container.ts`.

| Event | Source BC | Handler | NotificationType used |
|---|---|---|---|
| `AlertTriggeredEvent` | monitoring | `OnAlertTriggeredHandler` | `ALERT_TRIGGERED` |
| `AlertResolvedEvent` | monitoring | `OnAlertResolvedHandler` | `ALERT_RESOLVED` |
| `DeviceDisconnectedEvent` | device | `OnDeviceOfflineHandler` | `DEVICE_OFFLINE` |
| `DeviceConnectedEvent` | device | `OnDeviceOnlineHandler` | `DEVICE_ONLINE` |
| `UserAuthenticatedEvent` | user | `OnUserAuthenticatedHandler` | `USER_LOGIN_ALERT` |

The tenant-level handlers (`OnAlertTriggeredHandler`, `OnAlertResolvedHandler`, `OnDeviceOfflineHandler`, `OnDeviceOnlineHandler`) call `NotificationRoutingService.resolveRoutesForTenant` to fan out to the tenant's ADMIN/SUPERADMIN users. `OnUserAuthenticatedHandler` calls `resolveRoutes` for the single authenticated user. Each then issues one `DispatchNotification` command per resolved route/channel.

**Handler ownership:** `OnAlertTriggeredHandler` lives in this BC (`notification/application/event-handlers/on-alert-triggered.handler.ts`) and dispatches via `DispatchNotificationCommand` — it does **not** enqueue Slack jobs directly. The `monitoring` BC no longer owns an alert-triggered notification handler; a grep of `packages/core/src/monitoring` finds no `OnAlertTriggeredHandler`. Q3 (the migration of this handler out of monitoring) is resolved.
