# bc-notification — Aggregates

## Overview

The notification BC owns two aggregate roots:

1. **NotificationRecord** — an individual notification attempt (the central aggregate)
2. **NotificationPreference** — a user's per-channel, per-type delivery setting

Notification delivery infrastructure currently scattered across `monitoring/infrastructure/services/` (SlackNotificationService, SMSNotificationService) moves here during materialization.

---

## Aggregate root 1: NotificationRecord

Represents a single notification dispatch attempt on a specific channel. One domain event (e.g. `AlertTriggeredEvent`) may produce N records — one per enabled channel per recipient.

### Identity
- `NotificationRecordId` — UUID VO

### Fields

| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `NotificationRecordId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| userId | string \| null | `UserId` (user BC) | UUID nullable; null = system-level notification |
| type | string | `NotificationType` (shared) | Enum: ALERT_TRIGGERED, ALERT_RESOLVED, DEVICE_OFFLINE, DEVICE_ONLINE, SYSTEM_MAINTENANCE, USER_INVITATION, CUSTOMER_CREATED |
| channel | string | `NotificationChannel` (shared) | Enum: EMAIL, SMS, WEBHOOK, SLACK, TEAMS, PUSH |
| recipient | string | `NotificationRecipient` | Non-empty string ≤ 500 chars. Format validated against channel: email address for EMAIL, E.164 phone for SMS, HTTPS URL for WEBHOOK/SLACK/TEAMS, Pusher channel ID for PUSH |
| subject | string | `NotificationSubject` | Non-empty, ≤ 200 chars |
| body | string | `NotificationBody` | Non-empty, ≤ 10 000 chars. Pre-rendered at dispatch time |
| status | string | `NotificationDeliveryStatus` | Enum: PENDING, SENDING, DELIVERED, FAILED, DEAD, CANCELLED |
| attemptCount | number | `NotificationAttemptCount` | Integer ≥ 0; incremented on each send attempt |
| maxAttempts | number | `NotificationMaxAttempts` | Integer 1–10; default 3 |
| sourceEventId | string | `SourceEventId` | UUID string; correlates record to the domain event that triggered it |
| sourceEntityId | string \| null | `SourceEntityId` | UUID string nullable; e.g. the AlertId or DeviceId that this notification is about |
| errorMessage | string \| null | `NotificationError` | Nullable string ≤ 2 000 chars; last delivery error |
| scheduledAt | Date \| null | — | Bare nullable Date; null = send immediately |
| sentAt | Date \| null | — | Bare nullable Date; set when first SENDING transition occurs |
| deliveredAt | Date \| null | — | Bare nullable Date; set on DELIVERED |
| failedAt | Date \| null | — | Bare nullable Date; set on DEAD |
| createdAt | Date | — | UTC, set at creation |
| updatedAt | Date | — | UTC |
| deletedAt | Date \| null | — | Soft delete |

`bool` is the only allowed bare primitive. Every other field has a named VO.
Date fields are bare (not wrapped in VOs) because they carry no domain constraints beyond being UTC timestamps.

### Status lifecycle

```
PENDING ──► SENDING ──► DELIVERED  (terminal — success)
               │
               ▼
            FAILED ──► PENDING  (retry: attemptCount < maxAttempts)
               │
               ▼ (attemptCount == maxAttempts)
             DEAD  (terminal — exhausted)

PENDING ──► CANCELLED  (terminal — cancelled before first send)
```

No `is_*` boolean fields. Status is always the typed `NotificationDeliveryStatus` VO.

### Invariants

- [ ] `attemptCount` must be ≤ `maxAttempts` at all times
- [ ] `sentAt` is only set on first PENDING → SENDING transition
- [ ] `deliveredAt` is only set on SENDING → DELIVERED transition
- [ ] `failedAt` is only set when FAILED → DEAD transition occurs (i.e. exhausted)
- [ ] Cannot retry a DELIVERED, DEAD, or CANCELLED record
- [ ] Cannot cancel a record that is not in PENDING status
- [ ] `recipient` format must be compatible with `channel` (validated by `NotificationRecipient` VO + channel rule)
- [ ] `maxAttempts` is immutable after creation

### Domain services

- `NotificationRoutingService` — given a `NotificationType`, `CustomerId`, and optional `UserId`, resolves the set of active `NotificationPreference` entries to fan out dispatch across enabled channels. Called by event handlers before issuing `DispatchNotification` commands.

### BC layout (target)

```
app/src/lib/notification/
├── domain/
│   ├── entities/
│   │   ├── notification-record.entity.ts
│   │   └── notification-preference.entity.ts
│   ├── value-objects/
│   │   ├── notification-record-id.vo.ts
│   │   ├── notification-preference-id.vo.ts
│   │   ├── notification-delivery-status.vo.ts
│   │   ├── notification-recipient.vo.ts
│   │   ├── notification-subject.vo.ts
│   │   ├── notification-body.vo.ts
│   │   ├── notification-attempt-count.vo.ts
│   │   ├── notification-max-attempts.vo.ts
│   │   ├── notification-error.vo.ts
│   │   ├── source-event-id.vo.ts
│   │   └── source-entity-id.vo.ts
│   ├── interfaces/
│   │   ├── notification-record.repository.ts
│   │   ├── notification-preference.repository.ts
│   │   └── channel-dispatcher.interface.ts
│   ├── services/
│   │   └── notification-routing.service.ts
│   ├── events/
│   │   ├── notification-dispatched.event.ts
│   │   ├── notification-delivered.event.ts
│   │   ├── notification-failed.event.ts
│   │   └── notification-preference-updated.event.ts
│   └── exceptions/
│       ├── notification-not-found.exception.ts
│       ├── notification-already-terminal.exception.ts
│       └── push-token-not-configured.exception.ts
├── application/
│   ├── commands/
│   │   ├── dispatch-notification/
│   │   ├── retry-notification/
│   │   ├── cancel-notification/
│   │   ├── mark-notification-delivered/
│   │   ├── mark-notification-failed/
│   │   └── update-notification-preference/
│   ├── queries/
│   │   ├── get-notification-history/
│   │   ├── get-notification-preferences/
│   │   └── get-notification-record/
│   └── event-handlers/
│       ├── on-alert-triggered.handler.ts       (migrated from monitoring BC)
│       ├── on-alert-resolved.handler.ts
│       ├── on-device-offline.handler.ts
│       └── on-device-online.handler.ts
└── infrastructure/
    ├── repositories/
    │   ├── prisma-notification-record.repository.ts
    │   └── prisma-notification-preference.repository.ts
    ├── mappers/
    │   ├── notification-record.mapper.ts
    │   └── notification-preference.mapper.ts
    ├── services/
    │   ├── email-channel-dispatcher.ts
    │   ├── slack-channel-dispatcher.ts          (migrated from monitoring BC)
    │   ├── sms-channel-dispatcher.ts            (migrated from monitoring BC)
    │   ├── webhook-channel-dispatcher.ts
    │   └── push-channel-dispatcher.ts
    └── providers/
        └── notification.provider.ts
```

---

## Aggregate root 2: NotificationPreference

Stores a user's opted-in channel for a specific notification type. The combination (userId, channel, notificationType) is unique. Absent records mean the user has not configured that combination — default behaviour is determined by tenant-level defaults (Q4 in open-questions.md).

### Identity
- `NotificationPreferenceId` — UUID VO

### Fields

| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `NotificationPreferenceId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| userId | string | `UserId` (user BC) | UUID |
| channel | string | `NotificationChannel` (shared) | Enum: EMAIL, SMS, WEBHOOK, SLACK, TEAMS, PUSH |
| notificationType | string | `NotificationType` (shared) | Enum of supported types |
| enabled | bool | — | `bool` is permitted as a bare primitive |
| destination | string \| null | `NotificationRecipient` (reused) | Nullable. If null, the dispatcher resolves from user profile at send time. Must be non-empty when set; max 500 chars |
| createdAt | Date | — | UTC |
| updatedAt | Date | — | UTC |
| deletedAt | Date \| null | — | Soft delete |

Unique constraint: `(userId, channel, notificationType)`.

### Invariants

- [ ] `destination` when present must match the format expected by `channel`
- [ ] A user may not hold more than one preference per `(channel, notificationType)` combination

### Status lifecycle

NotificationPreference has no lifecycle state machine — `enabled` is the only toggle. Disable is a soft-deactivation (set enabled = false), not a delete.
