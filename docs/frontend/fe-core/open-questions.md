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

## Q2 _resolved_ — Token strategy: web vs mobile

The legacy Next.js app authenticates via cookie checked in `middleware.ts`. A Capacitor
app cannot rely on httpOnly cookies across the WebView reliably, and the API already
supports bearer JWT.

**Backend reality (verified against `apps/backend/src/routes/auth.router.ts` +
`middleware/auth.middleware.ts`):**

- There is **one** token, not an OAuth access/refresh pair. `/auth/login` returns
  `{ user, token }`; `/auth/refresh` takes the *current* token and **rotates** it to a
  new one. The "refresh token" and "access token" are the same value.
- The token is a **stateful JWT**: `jwt.verify(token, JWT_SECRET)` **and** a matching
  `session` row (`expiresAt > now`, `deletedAt: null`). It is therefore **server-side
  revocable** — logout / session-revoke genuinely invalidate it, not just client discard.
- `extractToken()` accepts the token via **httpOnly cookie (`auth-token`) first, then
  `Authorization: Bearer`** on every endpoint. Bearer transport already works end-to-end.
- Lifetime: 24h (`remember` → 7d), enforced by `session.expiresAt`.

**Decision:** unify on the single **session token** for both targets; canonical transport
is `Authorization: Bearer`. Persistence differs by platform (the `TokenStorage`
abstraction in T2 is exactly this seam):

| | Web | Mobile (Capacitor) |
|---|---|---|
| Token at rest | **in memory only** (never `localStorage`) | Capacitor **SecureStorage** |
| Persistence across reload/launch | the httpOnly `auth-token` cookie the backend already sets | SecureStorage |
| Bootstrap restore | `POST /auth/refresh` with `withCredentials: true` → cookie carries token → new token into memory | read SecureStorage, then `me()` / `refresh()` |
| Normal API calls | `Authorization: Bearer` from memory, `withCredentials: false` | `Authorization: Bearer` from SecureStorage |

The cookie is a **web-only persistence backstop**; bearer is the one canonical transport,
so web and mobile share the interceptor and generated-client code path. Rationale for
in-memory over `localStorage`: an XSS payload cannot exfiltrate a token it can't read,
and the server-side revocability + 24h expiry bound the blast radius if a token does leak.

**Backend changes required: none.**

**Security requirements (carry into T2/T4 — must be satisfied before the cookie path ships):**

- The cookie-carried `/auth/refresh` (the only `withCredentials: true` call on web) is a
  **CSRF-sensitive surface**. The cookie is currently `sameSite: 'lax'`; that blocks
  cross-site POSTs in modern browsers but is **not sufficient on its own**. Add explicit
  CSRF protection on this path — preferred: a double-submit CSRF token (or `sameSite:
  'strict'` scoped to the refresh cookie), validated server-side. Treat any backend tweak
  needed for this as a fe-core → backend follow-up, **not** an excuse to fall back to
  `localStorage`.
- All other API calls send `withCredentials: false`, so they carry no ambient cookie
  authority and are not CSRF-exposed (a stolen-token replay needs the bearer header, which
  CSRF cannot forge).

**Resolved:** 2026-06-11
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
