# bc-monitoring — Domain Events

## Existing events (do not re-emit)

| Event | Emitted by | Consumers |
|---|---|---|
| `AlertTriggeredEvent` | `CreateAlertHandler` / `ThresholdEvaluatorService` | notification BC → `DispatchNotification` |
| `AlertAcknowledgedEvent` | `AcknowledgeAlertHandler` | audit log |
| `AlertResolvedEvent` | `ResolveAlertHandler` | notification BC (optional resolution notice) |
| `AlertDeletedEvent` | `DeleteAlertHandler` | audit log |
| `MetricRecordedEvent` | `MetricsProcessorService` | `ThresholdEvaluatorService` |
| `ThresholdBreachedEvent` | `ThresholdEvaluatorService` | `AlertCreatorService` |
| `ThresholdCreatedEvent` | `CreateThresholdHandler` | audit log |
| `ThresholdUpdatedEvent` | `UpdateThresholdHandler` | audit log |
| `ReportGeneratedEvent` | `GenerateReportHandler` | audit log |

---

## New events (need scaffolding)

### AlertsBatchAcknowledgedEvent

**Emitted by:** `BatchAcknowledgeAlertsHandler`

**Payload:**
```typescript
{
  alertIds: string[];
  customerId: string;
  acknowledgedBy: string;
  count: number;
  occurredAt: string;
}
```

**Consumed by:** audit log

---

### AlertsBatchResolvedEvent

**Emitted by:** `BatchResolveAlertsHandler`

**Payload:**
```typescript
{
  alertIds: string[];
  customerId: string;
  resolvedBy: string;
  resolutionNote?: string;
  count: number;
  occurredAt: string;
}
```

**Consumed by:** audit log

---

### ThresholdDeletedEvent _(new)_

**Emitted by:** `DeleteThresholdHandler`

**Payload:**
```typescript
{
  thresholdId: string;
  customerId: string;
  deviceId: string | null;
  deletedBy: string;
  occurredAt: string;
}
```

**Consumed by:** audit log. Active alerts linked to this threshold are NOT auto-resolved — they continue until manually resolved.
