# bc-customer — Domain Events

## Existing events (do not re-emit)

| Event | Emitted by | Consumers |
|---|---|---|
| `CustomerCreatedEvent` | `CreateCustomerHandler` | notification BC (welcome email to first user) |
| `CustomerStatusChangedEvent` | `DeactivateCustomerHandler` | user BC (suspend all users of deactivated tenant) |
| `CustomerSettingsUpdatedEvent` | `UpdateCustomerHandler` | audit log |

---

## New events (need scaffolding)

### CustomerLimitsUpdatedEvent

**Emitted by:** `SetCustomerLimitsHandler`

**Payload:**
```typescript
{
  customerId: string;
  maxDevices: number;
  maxUsers: number;
  updatedBy: string;   // SUPERADMIN userId
  occurredAt: string;
}
```

**Consumed by:** audit log
