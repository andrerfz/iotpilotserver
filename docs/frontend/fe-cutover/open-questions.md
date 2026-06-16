# fe-cutover — Open Questions

## Q1 _resolved_ — Traefik routing: current state and cutover strategy

**Question:** How is Traefik currently routing between the two frontends, and what exactly
must change at cutover?

**Finding (from docker-compose files):**

Local (`docker-compose.local.yml`):
- `iotpilot-app` carries labels for routers `iotpilot-app-local` (priority 100,
  `Host(iotpilotserver.test)`) and `iotpilot-app-cf` (priority 100,
  `Host(dashboarddev.iotpilot.app)`).
- `iotpilot-ng` has **no Traefik labels** — it is only accessible via direct port
  mapping (port 4201 on the host), not through Traefik.
- `iotpilot-backend` carries labels at priority 200 for `/api/*` routing — these are
  **not touched** during cutover.

Production (`docker-compose.yml`):
- `iotpilot-app` carries labels for router `iotpilot` matching `Host(${DOMAIN}) || Host(${TAILSCALE_DOMAIN})`.
- `iotpilot-ng` block exists but is entirely **commented out** with a note
  "Disabled until fe-cutover."

**Decision:** The cutover sequence is:
1. T3 (local): add Traefik labels to `iotpilot-ng` for a new temporary hostname
   (`ng.iotpilotserver.test`) for side-by-side QA.
2. T4 (local): move the primary hostname labels from `iotpilot-app` to `iotpilot-ng`.
3. T5 (prod): uncomment the `iotpilot-ng` block in `docker-compose.yml`, ensuring its
   router rule matches the current `iotpilot` router. The `production-ng` build target
   uses nginx (port 80) — the Traefik label must set `loadbalancer.server.port=80`.
   The `iotpilot-app` service is disabled (comment out or remove its `traefik.enable`
   label).

**Resolved:** 2026-06-15
**Applies to:** T3, T4, T5

---

## Q2 _resolved_ — Legacy pages with Angular equivalents vs gaps

**Question:** Which legacy pages have a direct Angular equivalent? Are any missing?

**Finding:** All 24 legacy `page.tsx` files have Angular equivalents, as confirmed by the
parity checklist in `acceptance.md`. Two Angular routes exist that have no legacy
equivalent (`/monitoring` — implemented; `/logs` — placeholder). No legacy page is
missing an Angular counterpart. The `/devices/add` route is handled by the
`RegisterDeviceSheet` bottom sheet (opened from the devices list), not a separate routed
page — this is the correct Angular pattern per fe-ui-kit Q1.

**Decision:** No missing pages. Parity is complete. The `/admin/users/new` route from
the legacy is handled by `AdminNewUserModal` (per fe-admin Q1) — this is a deliberate
pattern change, not a gap.

**Resolved:** 2026-06-15
**Applies to:** T3 (parity QA), acceptance.md parity checklist

---

## Q3 _resolved_ — CSRF protection on `POST /api/auth/refresh` before production cutover

**Question:** fe-core Q2 identified that the `/api/auth/refresh` endpoint is CSRF-sensitive
because it accepts `withCredentials: true` (the `auth-token` cookie is ambient). The
current cookie is `sameSite: 'lax'`, which partially mitigates cross-site POSTs but is
not considered sufficient for a security-sensitive endpoint like token rotation.

Must this be hardened before the production Traefik switch (T5/T6), or can it ship
as-is with a deferred ticket?

**Impact:** Gates T5/T6 if the security team or project owner deems CSRF protection
mandatory for production. Non-blocking for T1–T4 (local and staging only).

**Options considered:**
- **Option A (preferred) — Add `sameSite: 'strict'` to the `auth-token` cookie:**
  Simplest backend change. `strict` blocks the cookie on ALL cross-site requests,
  including navigation links from other sites. For a dashboard app (no OAuth flows, no
  cross-site link trust needed), this is acceptable. Requires a one-line change in
  `apps/backend/src/routes/auth.router.ts`.
- **Option B — Double-submit CSRF token:** The client stores a random CSRF token (e.g.
  in a non-httpOnly cookie or localStorage), sends it as a header (`X-CSRF-Token`), and
  the server validates it matches the cookie. More robust but more code on both sides.
- **Option C — Accept current risk and defer:** `sameSite: 'lax'` already blocks
  cross-site POSTs from form submissions and `fetch` with `credentials: include`. The
  residual risk is `sameSite: 'lax'` does not block requests from certain navigation
  contexts. Acceptable if the project owner explicitly accepts it.

---

## Q4 _resolved_ — Rollback plan if production cutover fails

**Question:** What is the rollback procedure if the Angular app causes regressions after
the Traefik switch?

**Decision:** Fast rollback is a Docker Compose label swap — no code change, no build:

1. SSH to the production server.
2. In `docker-compose.yml`, re-enable the `iotpilot-app` service (uncomment
   `traefik.enable=true`) and comment out the `iotpilot-ng` Traefik router labels.
3. `docker compose up -d` — Traefik picks up the new labels within seconds.
4. Verify traffic returns to the legacy app via `curl -I https://${DOMAIN}`.

This is possible because the `iotpilot-app` block is kept commented (not deleted) until
T7. T7 only runs after 24 h of confirmed green production.

For the **local compose** (T4), rollback is the same: swap labels back in
`docker-compose.local.yml` and `docker compose up -d`.

The backend, database, Redis, and InfluxDB are untouched by the switch — no data
migration or rollback is needed for them.

**Resolved:** 2026-06-15
**Applies to:** T4, T5, T6

---

## Q5 _resolved_ — Next.js API routes: are any non-proxied routes that would break?

**Question:** Does the legacy `apps/frontend` serve any API routes that are NOT simple
proxies to the Express backend — and would removing it break device agents or other
consumers?

**Finding:** Two API routes exist in `apps/frontend/src/app/api/`:
1. `[...path]/route.ts` — pure catch-all proxy to `BACKEND_URL`. No logic other than
   header forwarding. Equivalent to Traefik's path routing to the backend.
2. `health/route.ts` — returns `{"status":"healthy","service":"iotpilot-frontend"}`.
   This is consumed by Docker's healthcheck: `curl http://localhost:3000/api/health`.

The Angular nginx container does NOT serve `/api/` routes. After cutover, all `/api/*`
requests are handled by the Express backend via Traefik (priority 200 rule is already
in place in both compose files). The Docker healthcheck for `iotpilot-ng` in the
production compose uses `wget -qO- http://localhost/index.html` (nginx serves the SPA),
not `/api/health` — so no dependency on the proxy health route.

Device agents call the backend directly (`/api/devices/heartbeat`, etc.) — they do not
go through the Next.js proxy. After cutover the backend is still reachable at the same
URL. No device agent changes are needed.

**Decision:** No breaking API routes. The catch-all proxy is redundant after Traefik
takes over. The health route is replaced by the nginx healthcheck pattern already
configured in the production compose comment block.

**Resolved:** 2026-06-15
**Applies to:** T5, T7

---

## Q6 _resolved_ — Should `apps/frontend` be archived or deleted entirely?

**Question:** Should the removal of `apps/frontend` be a `git rm` (history preserved in
git) or should the directory be archived somewhere (zip, tag, branch) before deletion?

**Decision:** `git rm -r apps/frontend/` — a plain commit. Git history inherently
preserves every version of every file; the last commit containing `apps/frontend` is
permanently accessible via `git log -- apps/frontend/` regardless of deletion. No zip
archive or separate branch is needed. A git tag `legacy-frontend-final` is created at
the last commit before T7's deletion commit, so archaeology is a single
`git checkout legacy-frontend-final -- apps/frontend/` away.

**Resolved:** 2026-06-15
**Applies to:** T7

---

## Q7 _resolved_ — Smoke-test scope: automated vs manual

**Question:** What should `make ng-parity` automate vs leave for manual steps?

**Decision:** Automate only what is reliable and fast:
- HTTP 200 (or expected redirect) for every routed URL, using a seeded test user's
  bearer token.
- `GET /api/health` returns `{"status":"healthy"}` from the backend.
- Static asset cache header check on a known bundle URL.

Manual steps (documented in acceptance.md) cover: form submissions, real-time data
rendering, SSH terminal interaction, API key lifecycle, theme persistence, and CSV export.
Attempting to automate these in a curl/Node script adds fragility for minimal value at
this stage — they are already covered by the parity checklist walkthrough done in T3/T4.

**Resolved:** 2026-06-15
**Applies to:** T2

---

## Q8 _resolved_ — Zoneless change detection: decision timing

**Question:** Per fe-foundation Q6, the zoneless migration was deferred to fe-cutover.
Does it block the Traefik switch?

**Decision:** No. T8 is a non-blocking parallel task. The Traefik switch (T3–T6) proceeds
regardless of the zoneless outcome. Rationale: the app is functionally correct with
zones; the zoneless migration is a performance/future-proofing improvement, not a
correctness requirement. If `ngx-echarts` is incompatible, we document it and move on.

**Resolved:** 2026-06-15
**Applies to:** T8
