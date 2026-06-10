# bc-customer — Aggregates

## Aggregate root: Customer

### Identity
- `CustomerId` — UUID VO (exists: `shared/domain/value-objects/customer-id.vo.ts` + `customer/domain/value-objects/customer-id.vo.ts`)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `CustomerId` | UUID, immutable |
| name | string | `CustomerName` | exists: non-empty, max 255 chars |
| slug | string | `CustomerSlug` | exists: kebab-case, unique globally, immutable after creation |
| status | enum | `CustomerStatus` | exists: ACTIVE \| INACTIVE \| SUSPENDED \| PENDING |
| domain | string? | `CustomerDomain` | MISSING — email domain for auto-assignment (e.g. "acme.com"), nullable |
| maxDevices | number | `MaxDevices` | MISSING — integer 1–10000; tenant device limit |
| maxUsers | number | `MaxUsers` | MISSING — integer 1–1000; tenant user limit |
| settings | object | `OrganizationSettings` | exists VO — timezone, locale, theme overrides, etc. |
| createdAt | Date | — | bare Date UTC |
| updatedAt | Date | — | bare Date UTC |
| deletedAt | Date? | — | soft delete |

### Missing VOs (need creation)
| Field | VO | Constraints |
|---|---|---|
| domain | `CustomerDomain` | valid domain format (RFC 1035), nullable, unique globally |
| maxDevices | `MaxDevices` | integer 1–10000 |
| maxUsers | `MaxUsers` | integer 1–1000 |

### Status lifecycle
```
PENDING ──► ACTIVE    (admin activates)
ACTIVE  ──► INACTIVE  (admin deactivates)
ACTIVE  ──► SUSPENDED (payment / policy violation)
SUSPENDED ──► ACTIVE  (reinstated)
any     ──► deleted   (soft delete, terminal)
```

### Invariants
- [ ] `slug` is globally unique and immutable after creation
- [ ] `domain` when set is globally unique — no two customers share the same email domain
- [ ] A tenant cannot exceed `maxDevices` registered devices
- [ ] A tenant cannot exceed `maxUsers` active users
- [ ] SUPERADMIN is not scoped to any customer (`customerId = null`)

### Domain services (existing)
- `CustomerCreatorService` — creates customer + default settings
- `CustomerLifecycleManagerService` — status transitions
- `CustomerValidatorService` — uniqueness checks
- `OrganizationManagerService` — settings management
- `TenantDataSegregationService` — enforces data isolation
- `TenantIsolationEnforcerService` — query-time tenant boundary checks

### BC layout (current + additions)
```
packages/core/src/customer/
├── domain/
│   ├── entities/customer.entity.ts                     (exists)
│   ├── value-objects/customer-id.vo.ts                 (exists)
│   ├── value-objects/customer-name.vo.ts               (exists)
│   ├── value-objects/customer-slug.vo.ts               (exists)
│   ├── value-objects/customer-status.vo.ts             (exists)
│   ├── value-objects/organization-settings.vo.ts       (exists)
│   ├── value-objects/customer-domain.vo.ts             (MISSING)
│   ├── value-objects/max-devices.vo.ts                 (MISSING)
│   └── value-objects/max-users.vo.ts                   (MISSING)
├── application/
│   ├── commands/create-customer/                       (exists)
│   ├── commands/update-customer/                       (exists)
│   ├── commands/deactivate-customer/                   (exists)
│   └── queries/
│       ├── get-customer/                               (exists)
│       ├── get-customer-by-domain/                     (exists)
│       ├── get-customer-settings/                      (exists)
│       └── list-customers/                             (exists — NOT exposed via HTTP)
└── infrastructure/
    ├── repositories/prisma-customer.repository.ts      (exists)
    └── services/customer-onboarding.service.ts         (exists)
```

## Critical gap: ListCustomers has no HTTP route

`list-customers` query exists in code but **no HTTP endpoint exposes it**. This is why the "New User" form requires a raw Customer ID text input — there's no `/api/customers` GET endpoint for the frontend to fetch the list.

This is the highest-priority gap in this BC.
