# fe-cutover — Tasks

Each task is one small PR. Tasks must be executed in order: T1 gates T2, T2 gates T3–T4,
T4 gates T5, T5 gates T6–T7. T8 (zoneless evaluation) is independent and non-blocking.

## Status

| # | Task | Status |
|---|---|---|
| T1 | Flip fe-admin status to done; pre-flight CI green check | ✅ done |
| T2 | Build parity smoke-test script (`make ng-parity`) | ✅ done |
| T3 | Local compose: add `iotpilot-ng` Traefik labels, run parity QA locally | ✅ done |
| T4 | Local compose: remove `iotpilot-app` frontend routing (keep backend), verify locally | ✅ done |
| T5 | Prod compose: uncomment `iotpilot-ng` block, disable `iotpilot-app`, deploy to staging | ✅ done |
| T6 | Production cutover: deploy prod compose, verify with smoke tests, monitor for 24 h | pending |
| T7 | Remove `apps/frontend` from the repo | 🔴 pending — `apps/frontend/` still on disk; gated on T6 |
| T8 | Zoneless change-detection evaluation and migration (optional, non-blocking) | pending |

---

### T1 — Pre-flight: fe-admin done + CI green

- **Does:** Confirms all upstream modules are complete before cutover begins.
  - Open `docs/frontend/fe-admin/tasks.md` — all tasks show `✅ done`.
  - Flip `docs/frontend/README.md` fe-admin Status column from `pending` to `✅ done`.
  - Run `make ng-lint && make ng-type-check && make ng-test` — all pass.
  - Run `make ng-api-check` — committed API client is not stale.
  - Verify `iotpilot-server-ng` container starts without errors (`make ng-logs`).
- **Output:** Green CI run (or equivalent local run). README updated. A commit
  `chore: pre-cutover green check — all modules done, CI green` is merged.
- **Invariant:** Do not proceed to T2 until this commit is green.

---

### T2 — Parity smoke-test script

- **Does:** Produces a runnable parity checklist that can be executed against both the
  legacy app (port 3001 in local compose) and the Angular app (port 4201).
  - Add a `Makefile` target `ng-parity` that runs a Node/curl script covering the
    routes in the parity checklist below.
  - The script hits each route on both apps, checks HTTP 200 (or expected redirect),
    and prints a pass/fail per route. It does not assert on DOM content — that is manual.
  - The script also verifies `GET /api/health` returns `{"status":"healthy"}` on the
    backend, confirming the backend is decoupled from the frontend container.
  - Document the manual steps for the behavioral checks that cannot be automated
    (form submissions, real-time data, SSH terminal) in `docs/frontend/fe-cutover/acceptance.md`
    under "Manual parity steps".
- **Output:** `Makefile` target `ng-parity` runs cleanly against the local compose stack.
  `make ng-parity` exits 0 when all automated checks pass.
- **Invariant:** The script must run inside or against Docker containers — no assumptions
  about host ports beyond what the local compose exposes.
- **BLOCKED BY:** T1 (need a green stack to test against).

---

### T3 — Local compose: expose `iotpilot-ng` via Traefik + run full parity QA

- **Does:** Wires `iotpilot-ng` into Traefik routing in `docker-compose.local.yml`
  **alongside** the legacy app, so both run simultaneously on different routes for QA.
  - Add Traefik labels to the `iotpilot-ng` service so it is reachable at
    `https://ng.iotpilotserver.test` (a new local-only hostname, separate from the
    main `iotpilotserver.test` which still goes to the legacy app).
  - Add `ng.iotpilotserver.test` to the local TLS cert / `/etc/hosts`.
  - Run `make ng-parity` against the Angular app hostname and manually walk every page
    in the parity checklist.
  - Record results in a parity QA log (markdown comment in the PR).
- **Output:** Both frontends accessible via Traefik. Parity QA pass record in the PR
  description. `docker-compose.local.yml` change committed.
- **Invariant:** Legacy app must keep serving `iotpilotserver.test` until T4. No user
  impact — this is local-only.
- **BLOCKED BY:** T2.

---

### T4 — Local compose: switch main hostname to `iotpilot-ng`, remove legacy routing

- **Does:** Flips the local routing so `iotpilotserver.test` now points to the Angular
  app. The legacy `iotpilot-app` container keeps running but loses Traefik labels.
  - In `docker-compose.local.yml`:
    - Move the `iotpilot-app-local` and `iotpilot-app-cf` router labels from
      `iotpilot-app` to `iotpilot-ng` (update port to 4200, service name to `iotpilot-ng`).
    - Remove the temporary `ng.iotpilotserver.test` labels from T3.
    - Leave `iotpilot-app` running (do not remove the container yet) for side-by-side
      fallback during the session.
  - Re-run `make ng-parity` against `iotpilotserver.test` — it must now hit Angular.
  - Manually verify login, dashboard, a device detail page, and settings — confirm no
    routing fallback to the legacy app.
- **Output:** `make ng-parity` passes against `iotpilotserver.test` (Angular). Manual
  smoke-test recorded in PR. `docker-compose.local.yml` change committed.
- **Invariant:** Backend Traefik rules (`iotpilot-backend-local`, priority 200) are
  unchanged — `/api/*` still routes to Express. Only the frontend rule changes.
- **BLOCKED BY:** T3 (parity QA must pass before routing switch).

---

### T5 — Production compose: enable `iotpilot-ng`, disable `iotpilot-app`, staging deploy

- **Does:** Updates `docker-compose.yml` for production and deploys to a staging
  environment (or the existing `dashboarddev.iotpilot.app` instance) for pre-prod
  validation.
  - In `docker-compose.yml`:
    - Uncomment the `iotpilot-ng` service block (lines 105–123 in the current file).
    - Set correct build target (`production-ng`), add `depends_on` for `postgres`, `redis`.
    - Comment out (do not delete yet) the `iotpilot-app` service block — leave it for
      easy rollback.
    - Ensure the `iotpilot-ng` router rule matches the same domains as the current
      `iotpilot-app` router: `Host(\`${DOMAIN}\`) || Host(\`${TAILSCALE_DOMAIN}\`)`.
    - Apply the same middlewares: `compression,security-headers` (remove `rate-limit`
      — it belongs on the backend, not the static SPA).
    - Backend router rule for `/api/*` priority 200 is unchanged.
  - Build the `production-ng` Docker image (`make ng-image`) and confirm it starts.
  - Deploy to staging / `dashboarddev.iotpilot.app`.
  - Run `make ng-parity` (or equivalent curl) against the staging domain.
- **Output:** `iotpilot-ng` serving `dashboarddev.iotpilot.app`. `make ng-parity` passes.
  `docker-compose.yml` committed with `iotpilot-app` commented out.
- **Invariant:** The `iotpilot-app` service block MUST remain in the file (commented)
  until T6 is fully validated — it is the fast rollback path.
- **BLOCKED BY:** T4 (local validation must pass first).

---

### T6 — Production cutover: deploy to prod, monitor 24 h, confirm rollback plan tested

- **Does:** Deploys the updated `docker-compose.yml` to the production server and monitors.
  - SSH to prod server, `git pull`, `docker compose pull && docker compose up -d`.
  - Immediately run `make ng-parity` (or `curl` equivalent) against the production domain.
  - Monitor error rates, response times, and application logs for 24 hours.
  - If any critical regression is detected: revert by uncommenting `iotpilot-app` and
    commenting `iotpilot-ng` in `docker-compose.yml` on the server, then `docker compose up -d`.
  - After 24 h green: delete the `iotpilot-app` commented block from `docker-compose.yml`
    and commit.
- **Output:** Production traffic served by Angular app for 24+ hours without regressions.
  `iotpilot-app` block removed from `docker-compose.yml`. Commit `feat: production cutover
  complete — iotpilot-ng is now the only frontend`.
- **Invariant:** Do not proceed to T7 until prod has been green for 24 h and the
  `iotpilot-app` block is gone from the compose file.
- **BLOCKED BY:** T5.

---

### T7 — Remove `apps/frontend` from the repo

- **Does:** Permanently deletes the legacy Next.js app and cleans up all references.
  - `git rm -r apps/frontend/`
  - Remove from `infra/docker/docker-compose.local.yml`: the `iotpilot-app` service block
    and its volume mounts (lines referencing `../../apps/frontend/`).
  - Remove from `infra/docker/Dockerfile`: the `development` build stage (which builds
    the legacy Next.js app). Confirm the `development-ng` and `production-ng` stages
    remain intact.
  - Remove from `Makefile`: `EXEC_FRONTEND` variable, `lint`, `test`, `test-unit`,
    `test-integration`, `test-file`, `test-debug`, `test-watch`, `test-coverage` targets
    that reference `iotpilot-server-app` / `apps/frontend`. Keep `ng-*` targets.
  - Update `pnpm-workspace.yaml` to remove `apps/frontend` if listed.
  - Update `docs/frontend/README.md`: flip `fe-cutover` status to `✅ done`.
  - Run `make ng-lint && make ng-type-check && make ng-test` — confirm still green.
- **Output:** `apps/frontend/` is absent from the repo. `git status` shows only
  deletions and cleanup changes. CI passes. Commit: `chore: remove apps/frontend —
  migration complete`.
- **Invariant:** Git history is preserved (this is a normal commit, not a rebase/filter).
  Git tags the last commit that contained `apps/frontend` for archaeology purposes.
- **BLOCKED BY:** T6.

---

### T8 — Zoneless change-detection evaluation (non-blocking)

- **Does:** Evaluates whether to migrate the Angular app to `provideZonelessChangeDetection()`.
  Per fe-foundation Q6, this was deferred to fe-cutover because `ngx-echarts` and the
  SSH terminal component might assume zones.
  - In a feature branch: replace `zone.js` in `polyfills.ts` with
    `provideZonelessChangeDetection()` in `app.config.ts`.
  - Run the full test suite and manually test the ECharts pages (metrics, monitoring)
    and SSH terminal.
  - If all pass: merge the branch and document the decision in fe-foundation Q6.
  - If `ngx-echarts` fails: document the incompatibility in fe-foundation Q6 as a
    new deferred item; close this task as "evaluated, not migrated".
- **Output:** Either the app runs zoneless (test suite green, ECharts + terminal verified)
  or a documented finding that zone migration is blocked by `ngx-echarts` version X.
- **Invariant:** This task does NOT block any other task. It may be merged before or
  after T7. If it causes regressions, close it without merging.
- **BLOCKED BY:** Nothing — can start any time after T1.
