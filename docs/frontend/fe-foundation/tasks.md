# fe-foundation — Tasks

Each task is one small PR. Order is binding (each builds on the previous).

## Status

| # | Task | Status |
|---|---|---|
| T1 | Scaffold workspace | done |
| T2 | Lint + format + strict TS | done |
| T3 | Vitest setup | done |
| T4 | Tailwind + Ionic theme entry | done |
| T5 | Docker dev service | done |
| T6 | Makefile targets | done |
| T7 | Husky integration | done |
| T8 | Smoke page + backend connectivity | done |
| T9 | Production build image | done |

---

### T1 — Scaffold workspace
- **Does:** `ionic start` (Angular, standalone, blank) into `apps/frontend-ng`; register in `pnpm-workspace.yaml`; pin Angular/Ionic versions; remove sample cruft.
- **Output:** `pnpm --filter frontend-ng dev` serves the blank app locally.
- **Constraint:** Angular standalone bootstrap (`bootstrapApplication`), zoneless if stable in chosen version — record in open-questions.

### T2 — Lint + format + strict TS
- **Does:** `angular-eslint` flat config; reuse repo Prettier config; `tsconfig` strict + `@ng/*` path alias.
- **Output:** `pnpm --filter frontend-ng lint` and `type-check` scripts pass.

### T3 — Vitest setup
- **Does:** `@analogjs/vitest-angular` + jsdom + Testing Library Angular; 15s timeout to match repo convention; one trivial component test.
- **Output:** `pnpm --filter frontend-ng test` green.

### T4 — Tailwind + Ionic theme entry
- **Does:** Tailwind wired into Angular build; `src/theme/variables.css` with Ionic CSS variables; verify no class conflicts with Ionic components (preflight scoping).
- **Output:** smoke page can mix `ion-button` + Tailwind utilities.

### T5 — Docker dev service
- **Does:** dev service `iotpilot-server-ng` in `docker-compose.local.yml` (HMR, volume mount, port `NG_PORT`, env from `.env.local`); add `NG_PORT`, `NG_API_URL` to `.env.example`.
- **Output:** `docker compose -f docker-compose.local.yml up iotpilot-server-ng` serves with hot reload.

### T6 — Makefile targets
- **Does:** `ng-dev`, `ng-lint`, `ng-test`, `ng-type-check`, `ng-build`, `ng-logs` mirroring the `local-*` conventions (exec in container).
- **Output:** targets documented in `make help`.

### T7 — Husky integration
- **Does:** pre-commit runs `ng-lint` + `ng-type-check` and pre-push runs `ng-test` **only when** staged/pushed files touch `apps/frontend-ng/**`; lint-staged entry for the new path.
- **Output:** commits touching only legacy frontend are unaffected.

### T8 — Smoke page + backend connectivity
- **Does:** `smoke.page.ts` calls `GET /health` on the backend (via `NG_API_URL`, dev proxy for CORS) and renders status; route `/smoke`.
- **Output:** proves env config, HttpClient, routing, and container networking.

### T9 — Production build image
- **Does:** multi-stage Dockerfile (pnpm build → nginx static); SPA fallback to `index.html`; add commented-out service stub in `docker-compose.yml` + Traefik labels (disabled until fe-cutover).
- **Output:** `make ng-build` produces a runnable image.
