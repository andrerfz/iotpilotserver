# fe-core — Tasks

Each task is one small PR. T1–T2 are prerequisites for everything; T3–T8 can interleave.

## Status

| # | Task | Status |
|---|---|---|
| T1 | Generated API client | done |
| T2 | Token storage + ApiError envelope | done |
| T3 | AuthService (login/logout/me/refresh) | done |
| T4 | Auth interceptor | done |
| T5 | Route guards | done |
| T6 | 2FA + session management | done |
| T7 | SocketService + alerts stream | done |
| T8 | Command/Query buses | done |
| T9 | Toast service | done |

---

### T1 — Generated API client
- **Does:** generate typed Angular services + models from `docs/openapi.yml` into `core/api/generated/`; npm script `api:generate`; `make ng-api-generate`; CI step fails if regeneration produces a diff (mirrors `make route-check`).
- **Output:** typed client for all 89 endpoints; no hand-written fetch anywhere downstream.
- **Invariant:** `core/api/generated/` is never edited by hand.

### T2 — Token storage + ApiError envelope
- **Does:** `TokenStorage` abstraction (web: memory + refresh cookie flow; mobile: Capacitor secure storage — see Q2); `ApiError` mapping the backend error envelope (status, code, message, details).
- **Output:** unit-tested, platform-agnostic primitives for T3/T4.

### T3 — AuthService
- **Does:** `login(email, password)`, `logout()`, `me()`, `refresh()`; session state as signals (`currentUser`, `isAuthenticated`, `role`); bootstrap restore on app init (`APP_INITIALIZER`/`provideAppInitializer`).
- **Output:** headless auth — testable without UI against the local backend.

### T4 — Auth interceptor
- **Does:** attach bearer token; on 401, single-flight refresh then retry once; on refresh failure, clear session and redirect to `/login`; skip list for `/auth/login`, `/auth/refresh`, `/devices/activate`.
- **Output:** integration test: expired token → transparent refresh → original request succeeds.

### T5 — Route guards
- **Does:** `authGuard` (redirect `/login?returnUrl=`), `roleGuard(minRole)` honoring USER < ADMIN < SUPERADMIN; matches legacy `middleware.ts` + `protected-route.tsx` semantics.
- **Output:** guard unit tests for each role × route class (public, user, admin, superadmin).

### T6 — 2FA + session management
- **Does:** `verify2fa(code)` continuation of login flow; `listSessions()`, `revokeSession(id)`, `revokeAllOtherSessions()` wrapping `/auth/sessions*`.
- **Output:** services consumed later by fe-auth (2FA page) and fe-settings (security page).

### T7 — SocketService + alerts stream
- **Does:** socket.io-client lifecycle bound to auth state (connect on login, disconnect on logout), auth handshake with JWT, reconnection with backoff; `alerts.stream.ts` exposing tenant-scoped alert events; replicate event names from legacy `use-websocket.ts` / `use-real-time-alerts.ts`.
- **Output:** integration test against local backend emitting a test alert.

### T8 — Command/Query buses
- **Does:** `CommandBus`/`QueryBus` injectables with handler registration via Angular DI multi-providers; base `Command`/`Query` types mirroring `packages/core` naming (`TenantAwareCommand` semantics come from the JWT, not the client); signal helper `runQuery()` exposing `{data, loading, error}` signals + invalidation hook for post-command refetch.
- **Output:** the pattern feature services build on; one example handler wired end to end.

### T9 — Toast service
- **Does:** thin `ToastService` over `ion-toast` for success/error; `ApiError` → user message mapping table.
- **Output:** consumed by every feature module; keeps `ion-toast` usage out of services/pages.
