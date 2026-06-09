# bc-customer — Open Questions

## Q1 _pending_ — maxDevices / maxUsers: schema migration required

**Question:** The `Customer` Prisma model may not have `maxDevices` and `maxUsers` fields. These are needed for `SetCustomerLimits`.

**Impact:** Gates `SetCustomerLimits` command — requires a migration before scaffolding.

**Resolution:** Check schema with `grep -n "maxDevices\|maxUsers" apps/backend/prisma/schema.prisma`. If absent, add migration before scaffolding the command.

---

## Q2 _resolved_ — ListCustomers: no scaffolding needed, just route wiring

**Decision:** `ListCustomersQuery` and handler already exist in `packages/core/src/customer/application/queries/list-customers/`. The fix is to add `GET /api/customers` to the admin router (or a new customers router), call the existing query, and restrict to SUPERADMIN. No new command bus scaffolding needed.

**Resolved:** 2026-06-09
**Applies to:** `ListCustomers` — route wiring only

---

## Q3 _resolved_ — New User form: customer selector scope

**Decision:** The "New User" form at `/admin/users/new` is SUPERADMIN-only (confirmed by `isSuperAdmin` check in `admin/users/page.tsx`). The customer selector should call `GET /api/customers` with a search param. For non-SUPERADMIN admins creating users, pre-fill `customerId` from `currentUser.customerId` and hide the selector.

**Resolved:** 2026-06-09
**Applies to:** `admin/users/new/page.tsx` — frontend only

---

## Q4 _resolved_ — CustomerDomain: collision handling

**Decision:** Any existing Customer with that domain (regardless of status — ACTIVE, INACTIVE, or SUSPENDED) blocks new Customer creation. The registering user sees "An account already exists for this domain. Contact your administrator." This is the safest option for tenant data integrity — no orphaned data, no accidental reactivation without admin oversight.

Future consideration: if "Asigna al existente" flow is desired (reactivate an INACTIVE tenant when the same email owner re-registers), it would require an email ownership verification step first. Not in scope now.

**Resolved:** 2026-06-09
**Applies to:** `GetCustomerByDomain` query — if found (any status), block `CreateCustomer`. `RegisterUser` handler error message update.
