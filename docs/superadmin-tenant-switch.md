# SUPERADMIN tenant switch ("act as customer")

## Problem
A SUPERADMIN has `customerId = null` (cross-tenant by design). Tenant-scoped
endpoints (device metrics/alerts, monitoring metrics/alerts, …) require a customerId
and 400/500 for a superadmin with no selected tenant. The per-endpoint bypasses
(use the device's own customerId; return empty) are tactical patches, not a model.

## Solution — a session-scoped acting tenant
A superadmin selects ("acts as") a customer; the choice is stored **server-side on
their session row** and resolved into the request's `TenantContext`. The user stays
SUPERADMIN; the session says which tenant they are currently operating in. Every
tenant-scoped query then receives a real customerId — no per-endpoint bypass.

This extends the mechanism already present in `auth.middleware.ts` → `buildTenantContext`,
which today honors an `X-Customer-Id` header **only for SUPERADMIN** (already role-gated,
no IDOR). We move the selection into the session so it persists without re-sending a
header, and add an explicit switch endpoint.

## Why it's secure
- **Role-gated:** only a verified SUPERADMIN can set/assume an acting tenant. For a
  normal user the value is never read — their tenant always comes from their own JWT
  (`user.customerId`). A normal user cannot escalate to another tenant.
- **Server-side storage:** the acting tenant lives in the `sessions` table (keyed by
  the session token), not in a client-tamperable JWT/cookie.
- **Validated:** the target customer must exist (and not be soft-deleted) before it is
  set.
- **Audited:** each switch (and clear) is written to the audit log (who, which tenant, when).
- **Cleared** on logout / session expiry (the session row goes away).

### Footgun to mitigate (UX, not security)
A persisted acting tenant is *sticky*: a superadmin could forget they are scoped to
tenant X and perform a write/delete believing they are global. Mitigations: a
persistent **"Viewing as <Customer>"** banner in the UI, an obvious exit control, and
the audit trail.

## Design

### Data
Add a dedicated nullable column to `Session` (not reuse `customerId`, which is the
login-time inherited tenant and is used in session validation):
```prisma
model Session {
  ...
  actingCustomerId String?   // SUPERADMIN "act as" tenant; null = global/none
  ...
}
```

### Resolution (middleware)
`resolveUser(token)` already loads the session row. Expose `actingCustomerId` on the
returned user. `buildTenantContext` for a SUPERADMIN resolves the tenant as:
```
session.actingCustomerId  ?? X-Customer-Id header  ?? null
```
(header kept as a fallback for programmatic/API use). Normal users are unchanged.

### Endpoints (auth.router, requireAuth + SUPERADMIN)
- `POST /api/auth/act-as { customerId }` — validate the customer exists, set
  `actingCustomerId` on the caller's current session, audit-log, return the active tenant.
- `DELETE /api/auth/act-as` — clear it (back to global), audit-log.
- `GET /api/auth/act-as` — return the currently-acting customer (for the UI banner).

### Frontend (separate chunk)
- A tenant picker (lists customers via `GET /admin/customers`) that calls `act-as`.
- A persistent **"Viewing as <Customer>"** banner with an exit button.
- On switch, refresh the current view.

## Relation to the deployed hotfix
The device metrics/alerts hotfix (use the device's own customerId for a superadmin)
stays as a sensible fallback when no acting tenant is set. Once this feature lands and
a tenant is selected, the normal tenant-scoped path serves those endpoints directly.

## Status
- ✅ Backend: `Session.actingCustomerId` column; `resolveUser` exposes it;
  `buildTenantContext` resolves it for SUPERADMIN (header kept as fallback);
  `GET/POST/DELETE /api/auth/act-as` (SUPERADMIN-only, validated, logged).
  Verified in dev: before act-as `/monitoring/*` → 400; after → 200; per-session.
- 🔴 Frontend: tenant picker + "viewing as" banner + service.

### Prod deploy note
`prisma migrate deploy` is a no-op here (no `migrations/` dir; dev uses `db push`).
Apply the column to prod before/with the backend restart:
```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "actingCustomerId" TEXT;
```
