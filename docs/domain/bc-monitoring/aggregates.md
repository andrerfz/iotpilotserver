# bc-monitoring — Aggregates

## Aggregate root 1: Alert

### Identity
- `AlertId` — UUID VO (exists: `monitoring/domain/value-objects/alert-id.vo.ts`)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `AlertId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| deviceId | string | `DeviceId` (device BC) | UUID — snapshot at creation |
| type | enum | `AlertType` | exists: HIGH_CPU \| HIGH_MEMORY \| HIGH_TEMPERATURE \| DISK_SPACE \| DEVICE_OFFLINE \| SECURITY_ALERT \| CUSTOM |
| severity | enum | `AlertSeverity` | exists: INFO \| WARNING \| ERROR \| CRITICAL |
| status | enum | `AlertStatus` | exists: ACTIVE \| ACKNOWLEDGED \| RESOLVED |
| title | string | `AlertTitle` | MISSING — non-empty, max 200 chars |
| message | string | `AlertMessage` | MISSING — non-empty, max 2000 chars |
| resolvedAt | Date? | — | bare Date nullable |
| acknowledgedAt | Date? | — | bare Date nullable |
| resolvedBy | string? | `UserId` (user BC) | UUID nullable |
| acknowledgedBy | string? | `UserId` (user BC) | UUID nullable |
| resolutionNote | string? | `ResolutionNote` | MISSING — max 2000 chars |
| metadata | object? | `AlertMetadata` | MISSING — JSON map of string→string, max 20 keys |
| thresholdId | string? | `ThresholdId` | UUID nullable — the threshold that triggered this alert |
| createdAt | Date | — | bare Date UTC |
| updatedAt | Date | — | bare Date UTC |
| deletedAt | Date? | — | soft delete |

### Missing VOs (need creation)
| Field | VO | Constraints |
|---|---|---|
| title | `AlertTitle` | non-empty, max 200 chars |
| message | `AlertMessage` | non-empty, max 2000 chars |
| resolutionNote | `ResolutionNote` | max 2000 chars, nullable |
| metadata | `AlertMetadata` | Record<string,string>, max 20 keys |

### Status lifecycle
```
ACTIVE ──► ACKNOWLEDGED ──► RESOLVED  (terminal)
ACTIVE ──────────────────► RESOLVED   (direct resolve)
```
No `resolved: boolean` field. Status is the typed `AlertStatus` VO.

### Invariants
- [ ] `resolvedAt` and `resolvedBy` are only set on RESOLVED transition
- [ ] `acknowledgedAt` and `acknowledgedBy` are only set on ACKNOWLEDGED transition
- [ ] A RESOLVED alert cannot be re-opened or re-acknowledged
- [ ] `thresholdId` when present must reference an existing `Threshold` in the same tenant

---

## Aggregate root 2: Threshold

### Identity
- `ThresholdId` — UUID VO (exists)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `ThresholdId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| deviceId | string? | `DeviceId` (device BC) | UUID nullable — null = global tenant threshold |
| metricType | enum | `MetricType` | MISSING: CPU \| MEMORY \| DISK \| TEMPERATURE \| BATTERY \| CUSTOM |
| operator | enum | `ThresholdOperator` | MISSING: GT \| LT \| GTE \| LTE \| EQ |
| value | number | `ThresholdValue` | MISSING: numeric, validated against metricType range |
| severity | enum | `AlertSeverity` | exists — severity of alert triggered when breached |
| enabled | bool | — | bare bool allowed |
| name | string | `ThresholdName` | MISSING — max 100 chars, human label |
| description | string? | `ThresholdDescription` | MISSING — max 500 chars |
| cooldownMinutes | number | `CooldownMinutes` | MISSING — integer 0–1440; prevents alert spam |
| createdAt | Date | — | bare Date UTC |
| updatedAt | Date | — | bare Date UTC |
| deletedAt | Date? | — | soft delete |

### Missing VOs (need creation)
| Field | VO | Constraints |
|---|---|---|
| metricType | `MetricType` | enum: CPU \| MEMORY \| DISK \| TEMPERATURE \| BATTERY \| CUSTOM |
| operator | `ThresholdOperator` | enum: GT \| LT \| GTE \| LTE \| EQ |
| value | `ThresholdValue` | positive number; context-validated (CPU 0–100, temp −30–120) |
| name | `ThresholdName` | non-empty, max 100 chars |
| description | `ThresholdDescription` | max 500 chars, nullable |
| cooldownMinutes | `CooldownMinutes` | integer 0–1440 |

### Invariants
- [ ] At most one enabled threshold per `(deviceId, metricType)` combination per tenant
- [ ] `value` range must be valid for `metricType` (CPU: 0–100, temperature: −30–120, etc.)
- [ ] `cooldownMinutes = 0` means no cooldown — no `isCooldownEnabled` bool
- [ ] A disabled threshold never triggers alerts (evaluated by `ThresholdEvaluatorService`)

---

## Aggregate root 3: MonitoringReport _(read-heavy, generation-only)_

### Identity
- `ReportId` — UUID VO (exists)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `ReportId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| type | enum | `ReportType` | MISSING: ALERTS \| METRICS \| THRESHOLDS \| SYSTEM |
| format | enum | `ReportFormat` | MISSING: JSON \| CSV \| PDF \| HTML |
| status | enum | `ReportStatus` | exists: PENDING \| GENERATING \| READY \| FAILED |
| deviceId | string? | `DeviceId` | UUID nullable — scope to device or null for tenant-wide |
| period | enum | `ReportPeriod` | MISSING: 1h \| 6h \| 24h \| 7d \| 30d |
| startTime | Date | — | bare Date UTC |
| endTime | Date | — | bare Date UTC |
| data | object? | `ReportData` | MISSING — generated JSON payload, max 10MB |
| generatedAt | Date? | — | bare Date, set when READY |
| createdAt | Date | — | bare Date UTC |

### Missing VOs (need creation)
| Field | VO | Constraints |
|---|---|---|
| type | `ReportType` | enum: ALERTS \| METRICS \| THRESHOLDS \| SYSTEM |
| format | `ReportFormat` | enum: JSON \| CSV \| PDF \| HTML |
| period | `ReportPeriod` | enum: 1h \| 6h \| 24h \| 7d \| 30d |

---

## Domain services (existing)
- `AlertCreatorService` — creates alerts from threshold breaches
- `AlertManagerService` — acknowledge/resolve logic
- `MetricsProcessorService` — processes incoming metrics from heartbeats
- `ThresholdEvaluatorService` — evaluates metric values against thresholds
- `ReportComposerService` — assembles report data

## BC layout (current + additions)
```
packages/core/src/monitoring/
├── domain/
│   ├── entities/alert.entity.ts                        (exists)
│   ├── entities/threshold.entity.ts                    (exists)
│   ├── entities/metric.entity.ts                       (exists)
│   ├── entities/monitoring-report.entity.ts            (exists)
│   ├── value-objects/alert-id.vo.ts                    (exists)
│   ├── value-objects/alert-severity.vo.ts              (exists)
│   ├── value-objects/alert-status.vo.ts                (exists)
│   ├── value-objects/alert-type.vo.ts                  (exists)
│   ├── value-objects/threshold-id.vo.ts                (exists)
│   ├── value-objects/metric-id.vo.ts                   (exists)
│   ├── value-objects/metric-value.vo.ts                (exists)
│   ├── value-objects/time-range.vo.ts                  (exists)
│   ├── value-objects/report-id.vo.ts                   (exists)
│   ├── value-objects/report-status.vo.ts               (exists)
│   ├── value-objects/alert-title.vo.ts                 (MISSING)
│   ├── value-objects/alert-message.vo.ts               (MISSING)
│   ├── value-objects/resolution-note.vo.ts             (MISSING)
│   ├── value-objects/alert-metadata.vo.ts              (MISSING)
│   ├── value-objects/metric-type.vo.ts                 (MISSING)
│   ├── value-objects/threshold-operator.vo.ts          (MISSING)
│   ├── value-objects/threshold-value.vo.ts             (MISSING)
│   ├── value-objects/threshold-name.vo.ts              (MISSING)
│   ├── value-objects/cooldown-minutes.vo.ts            (MISSING)
│   ├── value-objects/report-type.vo.ts                 (MISSING)
│   ├── value-objects/report-format.vo.ts               (MISSING)
│   └── value-objects/report-period.vo.ts               (MISSING)
└── application/
    ├── commands/update-threshold/                      (exists — no HTTP route)
    ├── commands/batch-acknowledge-alerts/              (MISSING)
    ├── commands/batch-resolve-alerts/                  (MISSING)
    └── queries/get-alert-trend/                        (MISSING)
```
