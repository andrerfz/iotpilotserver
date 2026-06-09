# bc-user — Domain Events

## Existing events (do not re-emit)

| Event | Emitted by | Consumers |
|---|---|---|
| `UserRegisteredEvent` | `RegisterUserHandler` | customer BC (auto-creates Customer) |
| `UserAuthenticatedEvent` | `AuthenticateUserHandler` | audit log |
| `UserLoggedInEvent` | `AuthenticateUserHandler` | audit log, login notification gate |
| `UserLoggedOutEvent` | `LogoutUserHandler` | audit log |
| `UserUpdatedEvent` | `UpdateUserHandler` | audit log |
| `ApiKeyCreatedEvent` | `CreateApiKeyHandler` | audit log |
| `ApiKeyRevokedEvent` | (revoke handler) | audit log |

---

## New events (need scaffolding)

### UserPreferencesUpdatedEvent

**Emitted by:** `UpdateUserPreferencesHandler`

**Payload:**
```typescript
{
  userId: string;
  customerId: string;
  category: 'PROFILE' | 'NOTIFICATIONS' | 'SECURITY' | 'SYSTEM';
  updatedKeys: string[];
  occurredAt: string; // ISO 8601 UTC
}
```

**Consumed by:**
- `notification` BC — when `category === 'NOTIFICATIONS'`: invalidate any cached notification preference lookups for this user
- Frontend `UserPreferencesContext` — via optimistic update (no event bus needed, handled in the PUT response)

---

## Login notification gate (event-driven, new)

`UserLoggedInEvent` is already emitted. A new listener in the `notification` BC should:
1. Receive `UserLoggedInEvent`
2. Call `GetNotificationPreferencesQuery` for the user
3. If `loginNotifications === true` → dispatch login alert email
4. Otherwise → no-op

**This is NOT a new event.** It is a new **consumer** of `UserLoggedInEvent` in the notification BC.
See `docs/domain/bc-notification/` for the dispatcher design.

---

## Session events (future, not blocking)

These are designed but not blocking current scaffolding:

### SessionCreatedEvent _(future)_
**Payload:** `{ userId, customerId, sessionId, expiresAt, occurredAt }`
**Consumed by:** audit log, anomaly detection (future)

### SessionRevokedEvent _(future)_
**Payload:** `{ userId, customerId, sessionId, revokedBy, occurredAt }`
**Consumed by:** audit log
