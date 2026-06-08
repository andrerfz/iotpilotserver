# bc-notification — Open Questions

## Q1 _resolved_ — Push token storage model

**Decision:** Add `UserPushToken` Prisma model owned by the `user` BC. Fields: `id`, `userId`, `customerId`, `platform` (IOS|ANDROID), `token`, `deviceLabel`, `lastSeenAt`, `createdAt`, `updatedAt`, `deletedAt`. Unique on `(userId, token)`. At dispatch time the `PushChannelDispatcher` queries all active tokens for the target userId.
**Resolved:** 2026-06-03
**Applies to:** `PushChannelDispatcher`, `NotificationChannel.PUSH`, Prisma migration

---

## Q2 _solved_ — Template ownership and rendering

**Decision:** Option A — pre-render in event handlers. Each handler (`OnAlertTriggeredHandler`, `OnDeviceOfflineHandler`, etc.) passes hardcoded English `subject`/`body` strings to `DispatchNotification`. Option B (`NotificationTemplate` aggregate) is planned as a follow-on feature.
**Resolved:** 2026-06-03 — see ADR-008
**Applies to:** All notification event handlers

---

## Q3 _resolved_ — Migration of monitoring BC's OnAlertTriggeredHandler

**Decision:** Option A — atomic swap. `monitoring/application/event-handlers/on-alert-triggered.handler.ts` and `monitoring/infrastructure/jobs/send-slack-alert-notification.processor.ts` are deleted in the same commit that adds `notification/application/event-handlers/on-alert-triggered.handler.ts`. The `service-container.ts` subscription for `AlertTriggeredEvent` is updated to point to the new handler. The monitoring BC emits events only; zero delivery logic remains there.
**Resolved:** 2026-06-03
**Applies to:** `service-container.ts`, monitoring BC event-handler deletion, notification BC event-handler creation

---

## Q4 _solved_ — Tenant-level notification defaults

**Decision:** Option B — `ALERT_TRIGGERED` and `DEVICE_OFFLINE` generate a synthetic EMAIL route in `NotificationRoutingService.resolveRoutes()` when no explicit `NotificationPreference` exists for the user. Explicit opt-out (`enabled: false`) suppresses the fallback.
**Resolved:** 2026-06-03 — see ADR-009
**Applies to:** `NotificationRoutingService.resolveRoutes()`

---

## Q5 _solved_ — Rate limiting per user/channel

**Decision:** Option A for MVP — no rate limiting in the notification BC. Threshold cooldown in `monitoring` covers alert storms. `NotificationRecord` schema has `(createdAt, type, channel, userId)` so Option B can be added without schema changes if production evidence warrants it.
**Resolved:** 2026-06-03 — see ADR-010
**Applies to:** `DispatchNotificationHandler`, `DispatchNotificationChannelProcessor`

---

## Q6 _resolved_ — Aggregate root choice

**Decision:** `NotificationRecord` is the primary aggregate root. `NotificationPreference` is a secondary aggregate in the same BC.
**Resolved:** 2026-06-03
**Applies to:** All commands, all queries, Prisma schema

---

## Q7 _resolved_ — Preference scoping: per-user vs per-tenant

**Decision:** Notification preferences are per-user. Each user configures their own channels. No tenant-level override in MVP (see Q4 for tenant defaults).
**Resolved:** 2026-06-03
**Applies to:** `NotificationPreference` aggregate, `UpdateNotificationPreference`, `GetNotificationPreferences`

---

## Q8 _resolved_ — Channels to support at materialisation

**Decision:** EMAIL, SLACK, SMS, WEBHOOK, PUSH (iOS/Android via Pusher). `NotificationChannel` shared VO already has EMAIL, SMS, WEBHOOK, SLACK, TEAMS. PUSH must be added to the shared VO before materialisation.
**Resolved:** 2026-06-03
**Applies to:** `NotificationChannel` shared VO, `PushChannelDispatcher`, blocked by Q1
