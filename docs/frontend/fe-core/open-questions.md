# fe-core — Open Questions

## Q1 _resolved_ — API client: generated vs hand-written

**Decision:** Generated from `docs/openapi.yml` (Angular generator producing HttpClient
services + typed models). The spec is already enforced against the Express routes by
`make route-check`, so the generated client is structurally guaranteed to match the
backend. Exact generator (`ng-openapi-gen` vs `openapi-generator-cli` typescript-angular)
is chosen in T1 by trying both against our spec and picking the cleaner output — record
the choice here when resolved.

**Resolved:** 2026-06-10
**Applies to:** T1, all feature modules

---

## Q2 — Token strategy: web vs mobile

The legacy Next.js app authenticates via cookie checked in `middleware.ts`. A Capacitor
app cannot rely on httpOnly cookies across the WebView reliably, and the API already
supports bearer JWT.

**Proposal:** unify on bearer JWT for both targets. Access token in memory, refresh token
in platform storage (web: `localStorage` or cookie — decide with security review; mobile:
Capacitor SecureStorage). Backend changes should not be needed (`/auth/refresh` exists).
Validate the refresh-token transport with the backend team before T2.

**Applies to:** T2, T3, T4, fe-mobile

---

## Q3 _resolved_ — State management for server data

**Decision:** No NgRx / TanStack Query port. Server state lives in feature services built
on the `runQuery()` signal helper (T8): `{data, loading, error}` signals + explicit
invalidation after commands. This mirrors the legacy `use-query.ts`/`use-command.ts`
pattern 1:1 and keeps the CQRS shape.

**Resolved:** 2026-06-10
**Applies to:** T8, all feature modules

---

## Q4 — EventBus: port or drop

Legacy has an `event-bus.provider.tsx` alongside command/query buses. Audit its real
usage in `apps/frontend/src` during T8: if it only relays socket events, fold it into
`alerts.stream.ts` and drop the abstraction; if features publish UI-level domain events,
port it as a third injectable.

**Applies to:** T7, T8

---

## Q5 — Socket auth handshake details

Confirm how the backend Socket.IO server authenticates (JWT in `auth` payload vs cookie
vs query param) and whether rooms are tenant-scoped server-side. Read
`apps/backend/src/http`/socket setup before T7 — the client must match exactly and must
not rely on cookies (mobile).

**Applies to:** T7, fe-mobile
