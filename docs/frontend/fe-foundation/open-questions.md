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

## Q5 _resolved_ — Directory and service naming

**Decision:** Keep `apps/frontend-ng` (pnpm package name `frontend-ng`) and container
`iotpilot-server-ng`. Legacy stays `apps/frontend` until fe-cutover, where it is removed
(not renamed) — so no `frontend-legacy` intermediate name is introduced.

**Resolved:** 2026-06-10
**Applies to:** T1, T5, T6, T7, fe-cutover

---

## Q6 _resolved_ — Zoneless change detection

**Decision:** Start **zone-based** for fe-foundation. Angular 20 ships stable zoneless
(`provideZonelessChangeDetection`), but the migration pulls in `ngx-echarts` (fe-dashboard)
and `@xterm/xterm` (fe-device-advanced) whose Angular wrappers assume zones. Per the
"if unsure, start zone-based" guidance, T1 keeps `zone.js` in `polyfills.ts` and standard
change detection. Revisit at fe-cutover once the third-party surface is known.

**Resolved:** 2026-06-10
**Applies to:** T1, fe-cutover

---

## Q7 _resolved_ — Pinned framework versions (T1 kickoff)

**Decision:** Versions are pinned exactly (no `^`/`~`) in `apps/frontend-ng/package.json`
for reproducible installs across Docker/CI. Chosen at kickoff:

| Package | Version |
|---|---|
| Angular (`@angular/*`) | `20.3.24` (CLI/build-angular `20.3.27`) |
| `@ionic/angular` | `8.8.9` (standalone mode, `@ionic/angular/standalone`) |
| `@capacitor/core` | `8.4.0` |
| `ionicons` | `7.4.0` |
| `rxjs` | `7.8.2` |
| `typescript` | `5.9.3` |
| `zone.js` | `0.15.1` |
| `angular-eslint` | `20.7.0` |

Bootstrap is standalone (`bootstrapApplication` + `provideIonicAngular`), no NgModules.

**Resolved:** 2026-06-10
**Applies to:** all modules (downstream `/fe-deepen` inputs)
