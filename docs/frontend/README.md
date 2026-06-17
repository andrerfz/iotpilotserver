# Frontend Migration — Ionic + Angular + Capacitor

Master plan for replacing `apps/frontend` (Next.js 14 + React + HeroUI) with a single
Ionic 8 + Angular codebase that ships as **web dashboard** and **native mobile app**
(Capacitor, iOS + Android). The backend (`apps/backend`, 89 REST endpoints documented in
`docs/openapi.yml`) and `packages/core` are **not touched** by this migration.

This directory is the authoritative design contract for the migration — the frontend
equivalent of `docs/domain/`. Read this README first, then the module docs for the part
you are executing.

## Goals

1. One frontend codebase → three targets: web (Traefik, replaces Next.js), iOS, Android.
2. Strangler migration in **small steps**: the legacy Next.js app keeps running until
   cutover; every module lands as a series of small PRs with its own acceptance criteria.
3. Modular by design: each module below is independently executable, documented, and
   testable. Workers (subagents/skills) specialize per module.

## Target architecture

```
apps/
├── frontend-ng/                  # Ionic 8 + Angular (standalone components, signals)
│   └── src/app/
│       ├── core/                 # api-client (OpenAPI-generated), auth, interceptors,
│       │                         # guards, socket, command/query buses
│       ├── shared/ui/            # UI kit: Ionic-based wrappers (replaces components/ui/)
│       ├── features/
│       │   └── {feature}/        # auth | settings | dashboard | devices | admin
│       │       ├── pages/        # routed Ionic pages
│       │       ├── components/   # feature-private components
│       │       └── services/     # commands/queries services (replaces React hooks)
│       └── app.routes.ts
├── frontend/                     # legacy Next.js — frozen, removed at fe-cutover
├── backend/                      # unchanged
└── worker/                       # unchanged
```

## Stack mapping

| Today (Next/React) | Target (Ionic/Angular) |
|---|---|
| App Router + `middleware.ts` | Angular Router + `CanActivate` guards + HTTP interceptor |
| Hooks `use-*-commands/queries` | Injectable services with signals |
| Contexts + tsyringe buses | Angular DI; `CommandBus`/`QueryBus` as injectables |
| HeroUI wrappers (`components/ui/`) | Ionic components + Tailwind |
| react-hook-form | Reactive Forms |
| recharts | ECharts (`ngx-echarts`) |
| socket.io-client, @xterm/xterm | Same libraries, Angular component wrappers |
| Vitest + Testing Library React | Vitest (`@analogjs/vitest-angular`) + Testing Library Angular |

## Modules

Execution order follows the dependency column. A module may start when its dependencies
reach **done**. Estimates are dev-days for one senior dev.

| Module | Scope | Depends on | Est. | Docs | Status |
|---|---|---|---|---|---|
| [fe-foundation](fe-foundation/) | Workspace, tooling, Docker, CI, Makefile, Husky | — | 4–6 | ✅ | ✅ done |
| [fe-core](fe-core/) | Generated API client, auth, interceptors, guards, socket, CQRS buses | fe-foundation | 6–9 | ✅ | ✅ done |
| [fe-ui-kit](fe-ui-kit/) | UI barrel from the design prototype (DataTable, BottomSheet, pickers, palette), tokens/theme, app shell | fe-core | 9–12 | ✅ | done |
| [fe-auth](fe-auth/) | Login, register, 2FA pages | fe-core, fe-ui-kit | 3–4 | ✅ | ✅ done |
| [fe-settings](fe-settings/) | Settings hub + profile/security/system/notifications | fe-auth | 3–4 | ✅ | ✅ done |
| [fe-dashboard](fe-dashboard/) | Home, device list, MetricsDashboard (ECharts) | fe-ui-kit | 4–6 | ✅ | ✅ done |
| [fe-device-detail](fe-device-detail/) | Device overview, alerts, commands, logs, network, storage, add | fe-dashboard | 7–10 | ✅ | ✅ done |
| fe-device-advanced | Real-time metrics charts, SSH terminal (xterm), device settings (split the 1,011-line page) | fe-device-detail | 6–9 | ✅ | ✅ done |
| [fe-admin](fe-admin/) | Admin stats, devices, users, users/new, logs, system | fe-ui-kit | 4–6 | ✅ | ✅ done |
| fe-mobile | Capacitor iOS/Android, push (FCM/APNs), touch UX, signed builds | all page modules | 6–9 | ✅ | ✅ done |
| [fe-cutover](fe-cutover/) | Test migration, parity QA, Traefik switch, remove `apps/frontend` | all | 8–12 | ✅ | pending |

**Total: 64–93 dev-days.** (fe-ui-kit grew 6–9 → 9–12 after adopting the design
prototype's larger component inventory — see below.)

## Design prototype

`docs/prototype frontend/IoT Pilot Console/` is the **visual/UX contract** for the new
app (tokens in `app.css`, kit inventory in `kit.jsx`, shell in `app.jsx`, page composition
in `views.jsx`). The legacy Next.js app remains the **behavioral** parity reference. Where
they conflict on looks, the prototype wins. See [fe-ui-kit/open-questions.md](fe-ui-kit/open-questions.md) Q7.

## Doc convention per module (docs/domain style)

Each module directory contains exactly four files:

| File | Contents (analog in `docs/domain/bc-*`) |
|---|---|
| `scope.md` | Purpose, target structure, inventory of legacy code being replaced, dependencies (≈ `aggregates.md`) |
| `tasks.md` | Ordered small tasks — **each task is one small PR** — with inputs, outputs, and "exists / needs work" tables (≈ `commands.md`) |
| `acceptance.md` | Verifiable acceptance criteria per task + module-level Gherkin scenarios (≈ `events.md`, feeds the acceptance pipeline) |
| `open-questions.md` | Same format as domain BCs: `Qn _resolved_ — title`, decision, date, applies-to |

Modules marked **⏳ deepen** have no docs yet — they must be deepened (planned skill
`/fe-deepen`, the frontend analog of `/bc-deepen`) **before** any code is written for them,
incorporating decisions made in earlier modules.

## Execution workflow (small steps)

1. **Deepen** — `/fe-deepen <module>` writes the four docs; human reviews open-questions.
2. **Execute** — one task from `tasks.md` per PR. Tasks are sized ≤ 1 dev-day.
3. **Check** — lint + type-check + tests for `frontend-ng` must pass (planned `/fe-check`).
4. **Parity** — page modules verify behavior against the still-running legacy page
   (planned `/fe-parity`).
5. **Mark done** — update the task status table in `tasks.md` and the module status here.

## Skills (workers as frontend specialists)

Mirroring the existing DDD skill family. All live in `.claude/skills/fe-*/`:

| Skill | Analog of | Purpose | Status |
|---|---|---|---|
| `/fe-deepen <module>` | `/bc-deepen` | Generate the four module docs from this README + legacy code inventory | ✅ |
| `/fe-check` | `/ddd-check` | Run lint + type-check + tests for `apps/frontend-ng`, unified report | ✅ |
| `/fe-ui-component` | — | One `shared/ui` kit component from prototype + legacy: component, barrel, test, demo entry | ✅ |
| `/fe-scaffold-page` | `/ddd-scaffold-backend` | One routed Ionic page: component, route + guards + crumbs, test, parity notes | ✅ |
| `/fe-scaffold-service` | `/ddd-scaffold-frontend` | Port one legacy hook to an Angular signals service over the buses + test | ✅ |
| `/fe-parity <page>` | `/verify` | Drive legacy and new page side by side, report behavioral diffs | ⏳ create when fe-dashboard starts |

Every scaffold skill ends by running `/fe-check` and flipping the task's row in the
module's `tasks.md` — docs and code never drift.

## Cross-cutting decisions

Decisions that bind all modules live in the module open-questions where they were made.
Index of the binding ones:

- Angular: latest stable at kickoff, standalone components + signals, **no NgModules, no NgRx** → [fe-foundation/open-questions.md](fe-foundation/open-questions.md)
- API client: **generated** from `docs/openapi.yml` (kept in sync by `make route-check`) → [fe-core/open-questions.md](fe-core/open-questions.md)
- Charts: ECharts via `ngx-echarts` → fe-dashboard (deepen)
- Tailwind: kept, alongside Ionic CSS variables → [fe-foundation/open-questions.md](fe-foundation/open-questions.md)

## Backlog

Tasks scoped but not yet assigned to a module sprint.

| # | Task | Module | Notes |
|---|---|---|---|
| 1 | **Settings → API Keys page** | fe-settings | Lista + crear + borrar API keys. Backend: `GET/POST/DELETE /api/auth/api-keys`. Necesario para que el usuario pueda obtener su key sin acceder a la DB. |
| 2 | **Export xlsx/pdf** | fe-dashboard / fe-admin | `onExportSelected()` in `devices.page.ts` is an empty stub. Admin-logs has CSV only. |
| 3 | **Production cutover** | fe-cutover | SSH to prod: `git pull && docker compose pull && up -d`. Blocked on deployment decision. |
| 4 | **Dependency upgrades** | fe-foundation | `xterm` → `@xterm/xterm`, `eslint` v8 → v9 flat config, `rimraf` v3 → v5, `glob` v7 → v10. Separate PR. |
| 5 | **Zoneless change detection** | fe-foundation | Optional: `provideExperimentalZonelessChangeDetection`. Non-blocking. |
| 6 | **macOS Capacitor app + BLE device claiming** | fe-mobile | Add `ng-cap-build-macos` make target. Use `@capacitor-community/bluetooth-le` to scan for C3/Heltec sensors in setup mode — replaces manual Device ID entry. Requires firmware changes on both sensor types. |
