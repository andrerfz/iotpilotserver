# fe-ui-kit — Scope

## Purpose

The shared visual layer every feature module builds on: the `shared/ui` barrel, design
tokens + theme service, and the global app shell (rail navigation, topbar, user menu,
command palette). After fe-ui-kit, feature modules compose pages exclusively from
`shared/ui` — never from `@ionic/angular` directly.

## Design source of truth

The visual prototype at **`docs/prototype frontend/IoT Pilot Console/`** is the design
contract (see [open-questions.md](open-questions.md) Q7):

| Prototype file | What it defines |
|---|---|
| `app.css` | Design tokens (CSS variables), dark/light via `data-theme`, component styles |
| `kit.jsx` | The target kit component inventory and their APIs |
| `app.jsx` | Shell: grouped rail (Operate/Administer), topbar (breadcrumbs, search/⌘K, theme toggle, user menu), tenant switcher |
| `views.jsx` | How pages compose the kit (reference for page modules) |

The **legacy app** (`apps/frontend/src`) remains the *behavioral* parity reference; the
prototype is the *visual/UX* contract. Where they conflict on looks, the prototype wins.

## Binding upstream decisions

- Tailwind for layout/spacing, Ionic CSS variables for color/typography; preflight scoped → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q3
- Standalone components + signals, no NgModules → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q1
- Vitest + Testing Library Angular → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md) Q4
- Theme persistence through the generated API client (`/settings/system`) → [fe-core/open-questions.md](../fe-core/open-questions.md) Q1
- Toast surface is fe-core's `ToastService` (prototype `ToastHost` styles apply to it) → [fe-core/tasks.md](../fe-core/tasks.md) T9

## Architecture findings

- Legacy kit is a **barrel** (`components/ui/index.ts`): 51 consumer files, zero direct
  `@heroui/*` imports outside it. The Angular kit replicates the shape: custom components
  where there is logic, re-exports of Ionic standalone components otherwise, and an ESLint
  `no-restricted-imports` rule banning `@ionic/angular` outside `shared/ui/`.
- The prototype enlarges the kit beyond the legacy wrappers: `DataTable`, `BottomSheet`
  (the signature selector shell), `FilterChip`, `DevicePicker`/`UserPicker`/
  `MultiSelectPicker`, `DateRangePicker`, `CommandPalette`, `Sparkline`, tenant switcher.
  This is why the module estimate rose from 6–9 to 9–12 days.

## Target structure

```
apps/frontend-ng/src/app/shared/ui/
├── index.ts                  # THE barrel — only import path for features
├── badges/                   # status.badge, severity.badge, role.badge, device-type.badge, status-dot
├── forms/                    # ui-input, ui-switch, ui-checkbox, ui-select (CVA wrappers)
├── data/                     # data-table, metric-card (with sparkline), empty-state
├── sheets/                   # bottom-sheet, filter-chip
├── pickers/                  # device-picker, user-picker, multi-select-picker, date-range-picker
├── theme/                    # tokens.css (from prototype app.css), theme.service.ts
└── demo/demo.page.ts         # kitchen-sink page, route /__ui (dev only)

apps/frontend-ng/src/app/shell/
├── shell.component.ts        # ion-split-pane: rail ≥1080px, drawer below (Q1)
├── rail.component.ts         # grouped nav (Operate/Administer) + badges + tenant footer
├── topbar.component.ts       # breadcrumbs, search button, theme toggle
├── user-menu.component.ts    # role + localhost gating (SUPERADMIN links)
├── command-palette.component.ts  # ⌘K search/navigate
├── network-status.component.ts
├── maintenance-banner.component.ts
└── app-logo.component.ts
```

## Legacy inventory replaced

| Legacy (apps/frontend/src) | Lines | Replacement |
|---|---|---|
| `components/ui/index.ts` + 20 re-export files | ~50 | barrel re-exports of Ionic components |
| `components/ui/StatusBadge.tsx` | 81 | `badges/status.badge.ts` (+ `status-dot` from prototype) |
| `components/ui/MetricCard.tsx` | 43 | `data/metric-card.component.ts` (prototype adds delta + sparkline) |
| `components/ui/SeverityBadge.tsx` | 33 | `badges/severity.badge.ts` |
| `components/ui/Input.tsx` | 33 | `forms/ui-input.component.ts` (CVA) |
| `components/ui/Switch.tsx` | 30 | `forms/ui-switch.component.ts` (CVA) |
| `components/ui/Checkbox.tsx` | 29 | `forms/ui-checkbox.component.ts` (CVA) |
| `components/ui/Button.tsx` | 27 | re-export `IonButton`; prototype variants map to Ionic `fill`/`color` (audit in T1) |
| `components/ui/EmptyState.tsx` | 26 | `data/empty-state.component.ts` |
| `components/ui/Table.tsx` + family | 17 | `data/data-table.component.ts` — prototype contract (sort, pager, selection) |
| `components/ui/DeviceTypeBadge.tsx` | 14 | `badges/device-type.badge.ts` |
| `contexts/user-preferences-context.tsx` (theme) | 133 | `theme/theme.service.ts` |
| `components/user-header.tsx` | 141 | `shell/topbar.component.ts` |
| `components/user-menu.tsx` | 384 | `shell/user-menu.component.ts` |
| `components/network-status.tsx` | 59 | `shell/network-status.component.ts` |
| `components/maintenance-banner.tsx` | 26 | `shell/maintenance-banner.component.ts` |
| `components/feature-status.tsx` | 60 | **DROPPED (Q6)** — debug-only: returns null unless `isDevelopment()` and consumed only inside dashboard's `{isLocalDevelopment() && …}` panel. Not ported. |
| `components/app-logo.tsx` | 54 | `shell/app-logo.component.ts` (prototype brand mark) |

New from prototype (no legacy counterpart): `BottomSheet`, `FilterChip`, `DevicePicker`,
`UserPicker`, `MultiSelectPicker`, `DateRangePicker`, `CommandPalette`, `Sparkline`,
tenant switcher, breadcrumbs.

Usage frequency in legacy (wrapper priority): Button ×32, Card ×27, Input ×17, Chip ×11,
Select ×9, Divider ×6, Modal ×5, EmptyState ×5, Table ×4, Switch ×4, StatusBadge ×4.

## Endpoints consumed

| Endpoint | Used by |
|---|---|
| `GET /settings` | ThemeService bootstrap |
| `PUT /settings/system` | ThemeService persistence |
| `GET /devices` | DevicePicker (via fe-core QueryBus) |
| `GET /users` | UserPicker (via fe-core QueryBus) |

All exist in `docs/openapi.yml`. No backend gaps. CommandPalette searches devices/alerts/
users via existing list endpoints (client-side filter — no search endpoint needed for v1).

## Dependencies

- **fe-core** — generated API client, AuthService signals (user menu, role gating),
  guards (shell renders post-auth), QueryBus (pickers).

## Out of scope

- `components/admin/admin-sidebar.tsx` (112) → **fe-admin**
- `components/device-nav.tsx` (321) → **fe-device-detail**
- Prototype `SSHTerminal`, `CommandSheet`, `RegisterDeviceSheet` → **fe-device-detail / fe-device-advanced**
- Prototype `Chart` (full time-series chart) → **fe-dashboard** (ECharts); only `Sparkline` is kit
- Prototype X-ray mode and background (`BgMenu`) gimmicks → not ported
- Toasts → **fe-core** T9 (kit provides only the prototype's visual style)
