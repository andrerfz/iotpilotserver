# fe-ui-kit — Tasks

Each task is one small PR. T1–T2 first (everything depends on barrel + tokens); T3–T8 are
independent of each other; T9 before T10–T11 (shell hosts them). The visual contract for
every task is the prototype (`docs/prototype frontend/IoT Pilot Console/`) — read the
matching `kit.jsx` component before implementing.

## Status

| # | Task | Status |
|---|---|---|
| T1 | Barrel + import lint rule | done |
| T2 | Design tokens + ThemeService | done |
| T3 | Badges + status dot | done |
| T4 | Form control wrappers (CVA) | done |
| T5 | MetricCard + Sparkline + EmptyState | pending |
| T6 | DataTable | pending |
| T7 | BottomSheet + FilterChip | pending |
| T8 | Pickers (device, user, multi-select, date range) | pending |
| T9 | Shell layout (split-pane rail + topbar) | pending |
| T10 | User menu + tenant switcher | pending |
| T11 | Command palette | pending |
| T12 | Shell satellites + demo page | pending |

---

### T1 — Barrel + import lint rule
- **Does:** create `shared/ui/index.ts` re-exporting the Ionic standalone components in use (frequency table in scope.md); map prototype `Button` variants (`primary/subtle/ghost/danger`, sizes) to Ionic `fill`/`color`/`size` — wrapper only if the mapping leaks; ESLint `no-restricted-imports` banning `@ionic/angular` outside `shared/ui/`.
- **Output:** features can only reach Ionic through the barrel; lint fails otherwise.
- **Test:** lint fixture proving a direct `@ionic/angular` import in a feature file fails.

### T2 — Design tokens + ThemeService
- **Does:** port the prototype's `app.css` CSS variables (colors, surfaces, radii, fonts incl. mono) into `theme/tokens.css` mapped onto Ionic CSS variables + Tailwind config; `theme.service.ts` with signal `'light'|'dark'|'system'` toggling Ionic palette + Tailwind `dark` + prototype `data-theme` semantics together; `system` follows `matchMedia` live; bootstrap from `GET /settings`, persist via `PUT /settings/system`, localStorage cache for pre-auth paint.
- **Output:** prototype look available to all components; theme switching app-wide without flash.
- **Test:** unit tests for the three modes + matchMedia change reaction.

### T3 — Badges + status dot
- **Does:** port prototype `StatusBadge`/`StatusDot` (incl. `live` pulse), `SeverityBadge` (critical/warning/info), `RoleBadge`, plus legacy `DeviceTypeBadge`. Status/severity → color maps reconciled: prototype `STATUS_META`/`SEV_META` for looks, legacy `StatusBadge.tsx` (81 l.) for the complete value set.
- **Output:** badge family in the barrel.
- **Test:** every legacy status/severity/type value renders; prototype color tokens applied.

### T4 — Form control wrappers (CVA)
- **Does:** `ui-input` (label, error display, password reveal — folds legacy `password-input.tsx`), `ui-switch`, `ui-checkbox` (prototype visual), `ui-select` as `ControlValueAccessor`s over Ionic controls with Reactive Forms validation display.
- **Output:** controls usable as `<ui-input formControlName="email">`.
- **Test:** CVA round-trip + error rendering per control.

### T5 — MetricCard + Sparkline + EmptyState
- **Does:** port prototype `MetricCard` (icon, label, value+unit, delta with direction, optional sparkline) and `EmptyState`; `Sparkline` as a small SVG component (no chart lib — prototype draws raw SVG; full charts are fe-dashboard).
- **Output:** all three in the barrel.
- **Test:** renders with/without optional inputs (delta, spark, action).

### T6 — DataTable
- **Does:** port prototype `DataTable`: typed column defs (label, width, sortable, custom render via `ng-template`), client sort + pagination, optional row selection with bulk-action bar slot, row click, `overflow-x: auto` (Q2), footer with count + pager; EmptyState integration.
- **Output:** the one table primitive for device lists, sessions, admin pages.
- **Test:** sort toggling, pager bounds, select-all-on-page semantics (matches prototype `toggleAll`), empty input shows EmptyState.

### T7 — BottomSheet + FilterChip
- **Does:** port the prototype's signature `BottomSheet` (title/sub, Cancel left / Save right, count badge, save-disabled state) over `ion-modal` with breakpoints; `FilterChip` (icon, label, active value, count, clear).
- **Output:** the selector shell every picker and filter bar builds on.
- **Test:** open/close/save events; saveDisabled blocks; chip clear emits.

### T8 — Pickers
- **Does:** `MultiSelectPicker` (generic, over BottomSheet), then `DevicePicker` and `UserPicker` as thin specializations fed by fe-core QueryBus (`GET /devices`, `GET /users`); `DateRangePicker` with prototype presets (24h/7d/…) + mini calendar.
- **Output:** picker family in the barrel.
- **Test:** multi/single modes, value round-trip, preset selection.

### T9 — Shell layout
- **Does:** `shell.component.ts` with `ion-split-pane` (Q1): `rail.component.ts` (grouped nav Operate/Administer from prototype `NAV`, badges, brand mark, tenant footer) persistent ≥1080px, overlay drawer below with hamburger; `topbar.component.ts` (breadcrumbs from route data, search button, theme toggle); router outlet; maintenance banner slot; guards from fe-core.
- **Output:** authenticated routes render inside the prototype shell on both form factors.
- **Test:** rail visible desktop-width, drawer + hamburger narrow-width; breadcrumbs follow route.

### T10 — User menu + tenant switcher
- **Does:** port prototype `UserMenu` (avatar, name, theme toggle entry, settings, logout) merged with legacy `user-menu.tsx` behavior — including **SUPERADMIN + localhost-only** Grafana/InfluxDB/debug links (commits `187fe5b`, `1c6d508`; read the legacy localhost detection); tenant block in rail footer (display-only v1 — see acceptance).
- **Output:** menu + tenant block live in the shell.
- **Test:** role × host matrix matches legacy exactly.

### T11 — Command palette
- **Does:** port prototype `CommandPalette`: ⌘K/Ctrl-K open, fuzzy search over nav routes + devices/alerts/users (client-side over fe-core QueryBus lists), keyboard navigation, recent/preset commands section.
- **Output:** global search/navigate from topbar button and shortcut.
- **Test:** keyboard open/navigate/select; route navigation fires; mobile fallback (topbar button opens it as sheet).

### T12 — Shell satellites + demo page
- **Does:** port `network-status` (online/offline), `maintenance-banner`, `app-logo` (prototype brand mark); audit `feature-status.tsx` — drop if debug-only (Q6); build `demo.page.ts` (kitchen sink of every barrel export, route `/__ui`, excluded from prod build).
- **Output:** complete kit reviewable on one page, web and mobile viewport.
- **Test:** demo page renders every barrel export without errors.
