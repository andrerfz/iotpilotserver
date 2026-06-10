# fe-ui-kit — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | Barrel exports compile; lint fixture with direct `@ionic/angular` import in a feature fails CI |
| T2 | Side-by-side with the prototype (`index.html` opened in a browser): tokens visually match in dark and light; theme switch + reload keep theme without flash; `PUT /settings/system` called once per change |
| T3 | Every legacy status/severity/type value renders; colors match prototype `STATUS_META`/`SEV_META`; `live` dot pulses |
| T4 | A Reactive Form using all four controls validates, shows errors on touch, round-trips values; password reveal works |
| T5 | MetricCard renders value+unit+delta+sparkline; EmptyState action emits |
| T6 | Sort, pagination, select-all-on-page and bulk bar behave exactly like prototype `DataTable`; horizontal scroll on narrow viewport |
| T7 | BottomSheet matches prototype layout (Cancel left / Save right, count); FilterChip active/clear states |
| T8 | DevicePicker/UserPicker list real seeded data via QueryBus; DateRangePicker presets select |
| T9 | ≥1080px: persistent rail with Operate/Administer groups; <1080px: drawer + hamburger; breadcrumbs follow route; unauthenticated access redirects |
| T10 | Role × host matrix matches legacy exactly (see parity checklist); tenant block renders name/region |
| T11 | ⌘K opens; typing filters routes + devices; Enter navigates; Escape closes; works as sheet on mobile |
| T12 | `/__ui` renders every barrel export; route absent from production build |

## Module-level scenarios

```gherkin
Feature: frontend-ng UI kit and shell

  Scenario: Theme follows system preference live
    Given a logged-in user with theme "system"
    When the OS switches from light to dark
    Then the app applies the dark palette without reload
    And the stored preference remains "system"

  Scenario: SUPERADMIN tooling links are environment-gated
    Given a SUPERADMIN session on a remote (non-localhost) host
    When the user opens the user menu
    Then Grafana, InfluxDB and debug links are NOT visible
    And on localhost the same session DOES see them

  Scenario: Command palette reaches a device
    Given seeded devices exist for the tenant
    When the user presses Cmd-K and types a device name
    Then the matching device appears and Enter navigates to its detail route

  Scenario: Features cannot bypass the kit
    Given a feature component importing IonButton from "@ionic/angular"
    When lint runs
    Then the build fails with the restricted-import error
```

## Parity checklist

Two references: the **prototype** for visuals/UX, the **legacy app** for behavior.

| Source | Behaviors to match |
|---|---|
| Prototype `app.jsx` shell | Rail groups/badges, breadcrumbs, topbar layout, tenant footer |
| Prototype `kit.jsx` `DataTable` | Sort direction toggle, select-all-on-page, bulk bar, pager |
| Prototype `kit.jsx` `BottomSheet` | Cancel/Save placement, count badge, disabled save |
| Legacy `contexts/user-preferences-context.tsx` | 3 theme modes; `system` reacts to `matchMedia`; persisted via `/api/settings` |
| Legacy `components/user-menu.tsx` | Menu items per role; Grafana/InfluxDB/debug only SUPERADMIN **and** localhost; logout clears session |
| Legacy `components/ui/StatusBadge.tsx` | Complete status → label map (81 lines — read, don't assume) |
| Legacy `components/password-input.tsx` | Reveal toggle folded into `ui-input` |
| Legacy `components/network-status.tsx` | Online/offline detection + indicator |
| Legacy `components/maintenance-banner.tsx` | Visibility condition |

Known prototype-only items accepted as **new** behavior (no legacy parity): command
palette, tenant switcher (display-only v1 — multi-tenant switching is a backend question
recorded in fe-core if pursued), filter chips, pickers, date range presets.

## Exit checklist (module → done)

- [ ] All 12 tasks merged and green in CI
- [ ] Zero `@ionic/angular` imports outside `shared/ui/` (lint-enforced)
- [ ] Demo page reviewed at desktop + mobile widths against the prototype
- [ ] README module table updated to `done`
- [ ] Open questions all `_resolved_`
- [ ] fe-auth, fe-dashboard, fe-admin can now be deepened (their UI inputs are final)
