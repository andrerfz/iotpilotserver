# fe-foundation — Open Questions

## Q1 _resolved_ — Angular flavor

**Decision:** Latest stable Angular at kickoff. Standalone components only (no NgModules),
signals for component state, RxJS only at service boundaries (sockets, streams). No NgRx —
the CQRS service layer (fe-core) plays that role, mirroring the legacy React architecture.

**Resolved:** 2026-06-10
**Applies to:** all modules

---

## Q2 _resolved_ — Workspace tooling: plain pnpm vs Nx

**Decision:** Plain pnpm workspace entry, like `apps/frontend`, `apps/backend`, `apps/worker`.
No Nx — the repo already has its own orchestration (Makefile + Docker) and one more meta-tool
adds onboarding cost without payoff at this scale.

**Resolved:** 2026-06-10
**Applies to:** T1, T6

---

## Q3 _resolved_ — Keep Tailwind alongside Ionic

**Decision:** Yes. Tailwind is kept for layout/spacing utilities; Ionic CSS variables own
colors/typography/theming. Tailwind preflight must be scoped or disabled to avoid resetting
Ionic component styles — verify in T4.

**Resolved:** 2026-06-10
**Applies to:** T4, fe-ui-kit

---

## Q4 _resolved_ — Test runner

**Decision:** Vitest via `@analogjs/vitest-angular` (not Karma/Jest), keeping the repo's
single test runner, reporters, and the existing `make test-*` mental model.

**Resolved:** 2026-06-10
**Applies to:** T3, fe-cutover

---

## Q5 — Directory and service naming

`apps/frontend-ng` + container `iotpilot-server-ng` are the working names. Confirm, or pick
final names before T1 (renaming later touches compose, Makefile, Husky, CI).

**Proposal:** keep `frontend-ng`; rename legacy to `apps/frontend-legacy` only at fe-cutover.

---

## Q6 — Zoneless change detection

Angular zoneless is stable in recent versions and pairs well with signals, but some
third-party wrappers (ngx-echarts, xterm integration) may assume zones. Decide at T1 after
checking the chosen Angular version; if unsure, start zone-based and revisit at fe-cutover.
