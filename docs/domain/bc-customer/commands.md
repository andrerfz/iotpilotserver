# bc-customer — Commands and Queries

## Existing commands (do not re-scaffold)

| Command | Notes |
|---|---|
| `CreateCustomer` | auto-invoked by `RegisterUser` when no matching customer found |
| `UpdateCustomer` | name, settings, domain |
| `DeactivateCustomer` | ACTIVE → INACTIVE |

## Existing queries (do not re-scaffold)

| Query | Notes |
|---|---|
| `GetCustomer` | by internal id |
| `GetCustomerByDomain` | lookup by email domain during registration |
| `GetCustomerSettings` | org-level settings |
| `ListCustomers` | exists in code — **no HTTP route** |

---

## Critical gap: ListCustomers has no HTTP route

`ListCustomersQuery` and handler exist in `packages/core/src/customer/application/queries/list-customers/`. This query is **never exposed via HTTP**, which is why:
1. The "New User" form has a raw text field for Customer ID instead of a dropdown
2. SUPERADMIN has no way to see all tenants from the UI

### Wire ListCustomers to HTTP

No new scaffolding needed — just add the route.

- **Route to add:** `GET /api/customers`
- **Auth:** SUPERADMIN only
- **Query params:** `page`, `limit`, `search`, `status`
- **Returns:** `CustomerDto[]` + pagination — id, name, slug, status, domain, userCount, deviceCount

---

## New commands (need scaffolding)

### SetCustomerLimits
Sets `maxDevices` and `maxUsers` for a tenant. Currently these fields may not exist in the Prisma schema — check migration needed.

- **Inputs:** `customerId: CustomerId`, `maxDevices: MaxDevices`, `maxUsers: MaxUsers`
- **Emits:** `CustomerLimitsUpdatedEvent`
- **Invariant:** `maxDevices` must be ≥ current active device count. `maxUsers` must be ≥ current active user count.
- **Route:** `PUT /api/customers/:id/limits`
- **Auth:** SUPERADMIN only
- **BLOCKED BY Q1** — requires schema migration to add `maxDevices`, `maxUsers` fields

---

## New queries (need scaffolding)

### GetCustomerSummary
Returns a single customer with aggregated counts for dashboard use.

- **Inputs:** `customerId: CustomerId`
- **Returns:** `CustomerSummaryDto` — name, slug, status, domain, userCount, deviceCount, alertCount, createdAt
- **Route:** `GET /api/customers/:id`
- **Auth:** SUPERADMIN (any customer) or ADMIN (own customer only)

---

## Frontend gaps

### New User form — Customer ID selector
- `admin/users/new/page.tsx` has a raw text `<Input>` for `customerId`
- Fix: replace with a `<Select>` populated from `GET /api/customers` (SUPERADMIN only)
- If not SUPERADMIN, pre-fill with the current user's `customerId` (read from auth context)

### No Customers management page
- No `/admin/customers` page exists
- After `GET /api/customers` is wired, a basic list page could be added to the admin sidebar

---

## Sensitive operations
| Command / Query | Requires |
|---|---|
| `CreateCustomer` | Internal (called from `RegisterUser`) or SUPERADMIN |
| `DeactivateCustomer` | SUPERADMIN only |
| `SetCustomerLimits` | SUPERADMIN only |
| `ListCustomers` | SUPERADMIN only |
| `GetCustomerSummary` | SUPERADMIN (any) or ADMIN (own) |
