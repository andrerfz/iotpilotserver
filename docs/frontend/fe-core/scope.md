# fe-core — Scope

## Purpose

The transversal layer every feature module consumes: typed API client generated from
`docs/openapi.yml`, authentication (login/refresh/2FA/sessions), HTTP interceptor, route
guards, Socket.IO service, and the frontend CQRS buses. After fe-core, feature modules
only write pages, components, and feature services.

## Target structure

```
apps/frontend-ng/src/app/core/
├── api/
│   ├── generated/            # OUTPUT of openapi generator — never hand-edited
│   └── api.config.ts         # base URL from environment
├── auth/
│   ├── auth.service.ts       # login, logout, refresh, me, 2FA — signal-based session state
│   ├── token.storage.ts      # web/mobile token persistence abstraction
│   ├── auth.interceptor.ts   # attach JWT, 401 → single-flight refresh → retry
│   └── guards.ts             # authGuard, roleGuard(USER|ADMIN|SUPERADMIN)
├── realtime/
│   ├── socket.service.ts     # socket.io-client lifecycle, auth handshake, reconnect
│   └── alerts.stream.ts      # tenant-scoped alert events as signal/observable
├── cqrs/
│   ├── command-bus.ts        # injectable; replaces tsyringe CommandBus provider
│   ├── query-bus.ts
│   └── types.ts              # Command/Query/Handler contracts (mirror packages/core naming)
└── errors/
    ├── api-error.ts           # normalized error from backend error envelope
    └── toast.service.ts       # user-facing error/success notifications (ion-toast)
```

## Legacy inventory replaced

| Legacy (apps/frontend/src) | Replacement |
|---|---|
| `contexts/auth-context.tsx` | `core/auth/auth.service.ts` |
| `context/providers/{command,query,event}-bus.provider.tsx` + `dependency-injection.provider.tsx` | `core/cqrs/*` via Angular DI |
| `hooks/queries/use-query.ts`, `hooks/commands/use-command.ts` (base hooks) | `core/cqrs` base types + signal helpers |
| `hooks/domain/use-websocket.ts`, `use-real-time-alerts.ts` | `core/realtime/*` |
| `middleware.ts` (route protection) | `core/auth/guards.ts` |
| Hand-written fetch calls in hooks | generated `core/api` client |

Feature-specific hooks (`use-device-*`, `use-monitoring-*`, etc.) are **not** ported here —
they belong to their feature modules.

## Dependencies

- fe-foundation (workspace, Vitest, Docker).
- `docs/openapi.yml` must stay authoritative — `make route-check` already enforces sync
  with the Express routes.

## Out of scope

- Login/register UI → fe-auth (fe-core ships services + guards, testable headlessly)
- SSH terminal socket usage → fe-device-advanced (consumes `socket.service.ts`)
- Push notifications → fe-mobile
