# bc-notification — Commands and Queries

## Commands (write operations)

### DispatchNotification

Creates a single `NotificationRecord` in `PENDING` status and enqueues a delivery job.
One domain event (e.g. `AlertTriggeredEvent`) triggers N `DispatchNotification` commands — one per active `NotificationPreference` for that event type. Fan-out is the responsibility of the event handler using `NotificationRoutingService`.

- **Inputs:**
  - `customerId: CustomerId`
  - `userId: UserId | null` — null for system-level notifications
  - `type: NotificationType`
  - `channel: NotificationChannel`
  - `recipient: NotificationRecipient` — caller must resolve the actual address from preferences
  - `subject: NotificationSubject`
  - `body: NotificationBody` — pre-rendered by the caller; this BC does not own templates
  - `sourceEventId: SourceEventId`
  - `sourceEntityId: SourceEntityId | null`
  - `maxAttempts?: NotificationMaxAttempts` — default 3
  - `scheduledAt?: Date | null` — null = immediate
- **Emits:** `NotificationDispatchedEvent`
- **Invariant:** `recipient` format must match `channel` type
- **Route:** Internal only — no HTTP route. Called from event handlers within this BC.

---

### RetryNotification

Re-queues a `FAILED` or `DEAD` notification for another delivery attempt. Increments `attemptCount` and resets status to `PENDING`.

- **Inputs:**
  - `notificationRecordId: NotificationRecordId`
  - `customerId: CustomerId`
- **Emits:** `NotificationDispatchedEvent` (same event, new attempt)
- **Invariant:** Record must be in `FAILED` or `DEAD` status. After retry, `attemptCount` must not exceed `maxAttempts` — if it would, the command is rejected.
- **Route:** `POST /api/notifications/:id/retry`
- **Auth:** ADMIN role required

---

### CancelNotification

Cancels a `PENDING` notification before any send attempt.

- **Inputs:**
  - `notificationRecordId: NotificationRecordId`
  - `customerId: CustomerId`
- **Emits:** none
- **Invariant:** Record must be in `PENDING` status. SENDING/DELIVERED/DEAD records cannot be cancelled.
- **Route:** `DELETE /api/notifications/:id`
- **Auth:** ADMIN role required

---

### MarkNotificationDelivered

Internal command called by job-queue workers after a successful delivery. Transitions record from `SENDING` → `DELIVERED`.

- **Inputs:**
  - `notificationRecordId: NotificationRecordId`
- **Emits:** `NotificationDeliveredEvent`
- **Invariant:** Record must be in `SENDING` status.
- **Route:** Internal — no HTTP route. Called by channel dispatcher infrastructure.

---

### MarkNotificationFailed

Internal command called by job-queue workers after a failed delivery attempt. Transitions record from `SENDING` → `FAILED` (if `attemptCount < maxAttempts`) or `SENDING` → `DEAD` (if exhausted).

- **Inputs:**
  - `notificationRecordId: NotificationRecordId`
  - `errorMessage: NotificationError`
- **Emits:** `NotificationFailedEvent`
- **Invariant:** Record must be in `SENDING` status.
- **Route:** Internal — no HTTP route.

---

### UpdateNotificationPreference

Upserts a user's preference for a specific (channel, notificationType) pair. If no record exists for `(userId, channel, notificationType)`, creates one; otherwise updates `enabled` and `destination`.

- **Inputs:**
  - `userId: UserId`
  - `customerId: CustomerId`
  - `channel: NotificationChannel`
  - `notificationType: NotificationType`
  - `enabled: bool`
  - `destination: NotificationRecipient | null` — null = resolve from user profile at dispatch time
- **Emits:** `NotificationPreferenceUpdatedEvent`
- **Invariant:** `destination` when provided must be non-empty and compatible with `channel` format.
- **Route:** `PUT /api/users/:userId/notification-preferences`
- **Auth:** User can manage their own preferences; ADMIN can manage any user in the tenant.

---

## Queries (read operations)

### GetNotificationHistory

Returns a paginated, filterable list of `NotificationRecord`s for a tenant or specific user.

- **Inputs:**
  - `customerId: CustomerId`
  - `userId?: UserId` — omit to get tenant-wide history (ADMIN only)
  - `type?: NotificationType`
  - `channel?: NotificationChannel`
  - `status?: NotificationDeliveryStatus`
  - `from?: Date`
  - `to?: Date`
  - `page: number` — ≥ 1
  - `limit: number` — 1–100, default 20
- **Returns:** `NotificationRecordDto[]` + pagination metadata
- **Route:** `GET /api/notifications`
- **Auth:** Users see own records only; ADMIN sees all tenant records; SUPERADMIN bypasses tenant scope.

---

### GetNotificationPreferences

Returns all `NotificationPreference` entries for a user.

- **Inputs:**
  - `userId: UserId`
  - `customerId: CustomerId`
- **Returns:** `NotificationPreferenceDto[]`
- **Route:** `GET /api/users/:userId/notification-preferences`
- **Auth:** User can read own preferences; ADMIN can read any user's preferences.

---

### GetNotificationRecord

Returns a single `NotificationRecord` by ID.

- **Inputs:**
  - `notificationRecordId: NotificationRecordId`
  - `customerId: CustomerId`
- **Returns:** `NotificationRecordDto`
- **Route:** `GET /api/notifications/:id`
- **Auth:** Users can only access their own records; ADMIN can access any record in the tenant.

---

## Sensitive operations

| Command / Query | Requires |
|---|---|
| `RetryNotification` | ADMIN role |
| `CancelNotification` | ADMIN role |
| `GetNotificationHistory` (tenant-wide) | ADMIN role |
| `DispatchNotification` | Internal — no HTTP auth, called only from event handlers |
| `MarkNotificationDelivered` | Internal — no HTTP auth |
| `MarkNotificationFailed` | Internal — no HTTP auth |

---

## Blocked commands

| Command | Blocked by |
|---|---|
| `DispatchNotification` (template rendering) | **Q2** — Non-blocking for MVP; event handlers pre-render English templates. Blocks multi-language / admin-configurable templates. |

_Q1 (PUSH channel) and Q3 (monitoring handler migration) are now resolved — no commands blocked by them._
