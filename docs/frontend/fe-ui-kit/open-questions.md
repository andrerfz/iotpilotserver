# fe-ui-kit — Open Questions

## Q1 _resolved_ — Mobile navigation pattern

**Decision:** Follow the design prototype (`docs/prototype frontend/IoT Pilot Console/`):
grouped side rail (Operate: Dashboard, Devices, Monitoring, Logs / Administer: Users,
Settings) with badges and tenant switcher footer. Implemented as `ion-split-pane` +
`ion-menu`: persistent rail ≥ 1080px, overlay drawer below (hamburger in topbar) — the
prototype hides the rail at ≤1080px without replacement, so the drawer is the Ionic
completion of that intent. No bottom tabs. Mobile-native feel comes from the prototype's
signature **BottomSheet** pattern for pickers/filters/forms, not from tab navigation.

**Resolved:** 2026-06-10
**Applies to:** T9 (shell), fe-mobile

---

## Q2 _resolved_ — Responsive table strategy

**Decision:** The prototype's `DataTable` defines it: sortable columns, client pagination,
selectable rows with a bulk-action bar, wrapped in `overflow-x: auto` — horizontal scroll
on narrow viewports, no card-per-row transform. Optional per-column `hideBelow` breakpoint
may be added later without changing the contract.

**Resolved:** 2026-06-10
**Applies to:** T6, fe-dashboard, fe-admin

---

## Q7 _resolved_ — Design source of truth

**Decision:** The visual prototype at `docs/prototype frontend/IoT Pilot Console/`
(app.css tokens, kit.jsx components, app.jsx shell) supersedes the legacy HeroUI look as
the design reference. The legacy app remains the **behavioral** parity reference; the
prototype is the **visual/UX** contract. Components present in kit.jsx but feature-scoped
(SSHTerminal, CommandSheet, RegisterDeviceSheet) belong to their feature modules, not the
kit. Prototype dev gimmicks (X-ray mode, background menu) are not ported.

**Resolved:** 2026-06-10
**Applies to:** all fe-ui-kit tasks, all page modules

---

## Q3 _resolved_ — Wrapper policy: wrap vs re-export

**Decision:** Mirror the legacy barrel exactly. Custom Angular components only where the
legacy wrapper had logic (badges, MetricCard, EmptyState, form controls needing CVA,
table) — 9 of 29. Everything else is re-exported from `shared/ui/index.ts` as the Ionic
standalone component. The invariant "features never import `@ionic/angular`" is enforced
by ESLint `no-restricted-imports`, not by wrapping everything.

**Resolved:** 2026-06-10
**Applies to:** T1, all feature modules

---

## Q4 _resolved_ — Component selector prefix

**Decision:** `ui-` prefix for kit components (`ui-input`, `ui-table`), `app-` for shell
components. Configured in `angular.json` lint rules per directory.

**Resolved:** 2026-06-10
**Applies to:** T1–T9

---

## Q5 _resolved_ — Theme mechanism

**Decision:** One `ThemeService` toggles Ionic's dark palette class and Tailwind's `dark`
class on `<html>` simultaneously — single source of truth, mirroring legacy
`applyTheme()` (including live `matchMedia` tracking for `system`). Persistence through
the generated client (`GET /settings`, `PUT /settings/system`) with a localStorage cache
so the pre-auth paint uses the last known theme.

**Resolved:** 2026-06-10
**Applies to:** T2, fe-settings (system settings page reuses this service)

---

## Q6 _resolved_ — feature-status.tsx fate

**Decision:** Audit at T9. Recent commits (`63631af`) restrict debug panels to
SUPERADMIN + localhost; if `feature-status` is only consumed by those panels, it is not
ported and gets recorded as dropped in scope.md. Decision deferred to code reading, not
to a human.

**Resolved:** 2026-06-10
**Applies to:** T9
