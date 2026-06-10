# fe-foundation — Scope

## Purpose

Stand up the `apps/frontend-ng` workspace with all tooling, so every later module only
writes feature code. Nothing user-facing ships here except a smoke page proving the
toolchain works end to end (build → container → backend reachable).

## Target structure

```
apps/frontend-ng/
├── src/
│   ├── app/
│   │   ├── app.component.ts          # shell (placeholder until fe-ui-kit)
│   │   ├── app.routes.ts
│   │   └── smoke/smoke.page.ts       # calls GET /health, shows result
│   ├── environments/                 # environment.ts / environment.local.ts
│   ├── theme/                        # Ionic CSS variables + Tailwind entry
│   └── main.ts                       # bootstrapApplication, provideIonicAngular
├── Dockerfile                        # multi-stage: build → nginx (web target)
├── ionic.config.json
├── tailwind.config.ts
├── vitest.config.ts                  # @analogjs/vitest-angular
├── eslint.config.js                  # angular-eslint, aligned with repo Prettier
├── tsconfig.json                     # strict, path alias @ng → src/app
└── package.json
```

## Legacy inventory replaced

None — this module replaces no legacy code. `apps/frontend` keeps running untouched on
its current port; `frontend-ng` runs alongside on a separate port.

## Existing repo assets to integrate (do not duplicate)

| Asset | Integration |
|---|---|
| pnpm workspace (`pnpm-workspace.yaml`) | add `apps/frontend-ng` |
| `docker-compose.local.yml` | new service `iotpilot-server-ng`, dev server with HMR |
| `Makefile` | new targets `ng-dev`, `ng-lint`, `ng-test`, `ng-build` |
| Husky pre-commit (lint + type-check in container) | extend to `frontend-ng` when staged files match `apps/frontend-ng/**` |
| Husky pre-push (unit tests) | extend with `ng-test` |
| `.env.example` / `.env.local` | `NG_PORT`, `NEXT_PUBLIC_API_URL` equivalent (`NG_API_URL`) |

## Dependencies

None. First module to execute.

## Out of scope

- Auth, API client, sockets → fe-core
- Any real UI, theme tokens beyond defaults → fe-ui-kit
- Capacitor projects → fe-mobile (foundation only ensures the build is Capacitor-compatible: SPA, hash-free router, relative asset paths)
