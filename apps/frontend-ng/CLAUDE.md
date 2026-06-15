# CLAUDE.md — apps/frontend-ng

Angular/Ionic rewrite of the Next.js frontend. This file is the authoritative reference
for conventions, patterns, and known gotchas in this sub-project. Skills and agents
working in this directory must read it before writing code.

The prototype visual contract lives at:
`docs/prototype frontend/IoT Pilot Console/app.css`

---

## Stack

- **Angular 20** — standalone components, signals, `ChangeDetectionStrategy.OnPush`
- **Ionic 8** — web components for layout/navigation; custom UI kit for everything else
- **SCSS** — co-located per component via `styleUrl`
- **Tailwind** — layout and spacing utilities only; colors/typography via CSS tokens
- **RxJS** — only where Angular lacks a signal-native API (e.g. debounced search)

---

## Angular conventions

### Control flow — `@if` / `@for`, never `*ngIf` / `*ngFor`

Angular 20 marks `NgIf`, `NgForOf`, `NgSwitch` as `@deprecated` (removal in v22).
Always use built-in control flow:

```html
@if (condition) { … }
@for (item of list; track item.id) { … } @empty { … }
@switch (value) { @case ('x') { … } }
```

`NgTemplateOutlet` is NOT deprecated — retain for custom cell rendering in data tables.
`NgClass` is replaced by `[class.x]` bindings.

### Standalone components only — no NgModules

Every component, directive, and pipe is standalone. Declare everything in the
component's `imports: []` array.

### Signals for state

- `signal()` for local mutable state
- `computed()` for derived state
- `input()` / `output()` for component I/O
- `inject()` for dependency injection (no constructor DI)
- `DestroyRef` + `onDestroy()` for cleanup instead of `ngOnDestroy` where possible

---

## Styling conventions

### Co-located `.scss` via `styleUrl`

Each component has its own `.scss` file next to the `.ts`. Do not use inline `styles:[]`.
Exception: `theme/tokens.css` and `theme/tailwind.css` stay `.css` — converting them
to `.scss` would break the required import ordering in `global.scss`.

### Prototype as source of truth

Port styles **1:1 from `app.css`** — values, class names, spacing, radii.
Always read the matching `app.css` block before writing any component CSS.
Relevant sections: `.sheet*`, `.chip*`, `.opt*`, `.rail*`, `.topbar`, `.nav-item*`,
`.metric*`, `.table*`, `.badge*`, `.palette*`.

### Theming via CSS custom properties

Never hardcode color values. Always use design tokens:

| Token | Role |
|---|---|
| `--bg` | Page background |
| `--elevated` | Rail, toolbar background |
| `--surface` | Card, input background |
| `--surface-2` | Hover state, segment track |
| `--surface-3` | Active chip bg, badge bg |
| `--ui-border` | Default border (see gotcha below) |
| `--border-strong` | Focused / prominent borders |
| `--text` | Primary text |
| `--text-muted` | Secondary text |
| `--text-dim` | Labels, placeholders |
| `--primary` | Brand accent |
| `--primary-weak` | Active chip / item background |
| `--primary-line` | Active chip / item border |

Dark mode is the default (`:root`). Light mode is `[data-theme="light"]`.
Both are set in `src/app/shared/ui/theme/tokens.css`.

---

## Ionic gotchas

### `--ui-border` — never use bare `--border`

`ion-split-pane` defines `--border: 1px solid <color>` on its host and it inherits
into the entire authenticated app. The kit border token is **`--ui-border`** (a color).
Using `var(--border)` inside `/app/*` expands to `1px solid 1px solid …` → invalid →
no border rendered. `--border-strong` does not collide and can be used as-is.

**Rule:** never create a global design token named `--background`, `--color`,
`--padding`, `--border-radius`, or `--border` — Ionic reserves these.
Prefix kit tokens with `--ui-*` when in doubt.

### Ionic color step system

Ionic components (`ion-card-title`, `ion-card-subtitle`, `ion-list-header`, etc.) use
`--ion-color-step-N` for text colors. Without explicit mapping these fall back to
Ionic's light-palette values (e.g. step-850 = `#262626`) which are unreadable in
dark mode.

Steps 600–950 are mapped in `tokens.css` to the kit's `--text*` tokens. If a new
Ionic component shows unreadable text in dark mode, add the missing step mapping there.

### Shadow DOM and CSS

Ionic web components use shadow DOM. `align-items` on `ion-card-content` won't reliably
align slotted children — wrap them in a plain `<div>` that you fully control.

`ion-segment` / `ion-segment-button`: active pill must use `--surface-3` (not
`--surface`) in dark mode because surface (13% L) is darker than surface-2 (17% L).
Override in `global.scss` with `[data-theme="dark"] ion-segment-button { ... }`.

---

## Shell architecture

```
ShellComponent (ion-split-pane)
├── ion-menu → RailComponent          (desktop ≥1080px, inline)
└── .main (flex column)
    ├── TopbarComponent               (56px fixed)
    ├── ion-router-outlet             (flex: 1)
    └── BottomNavComponent            (mobile <1080px, position: fixed overlay)
```

### TopbarService

Pages inject `TopbarService` to set a centered mobile title and an optional action
button shown in the topbar:

```typescript
this.topbar.set('Users', { icon: 'add-outline', handler: () => this.openModal() });
this.destroy.onDestroy(() => this.topbar.clear());
```

- **Title** is centered on mobile; desktop uses breadcrumbs from route `data.breadcrumb`.
- **Action button** (the `+`) appears on all screen sizes to the right of the search button.
- Call `topbar.clear()` on destroy so the title doesn't bleed into the next page.

### Multi-action topbar pattern

When a page has **2 or more add actions**, do NOT show multiple buttons.
Show a single `+` that opens a `ui-bottom-sheet` at half screen height listing the
addable item types (icon + label per row).

### Mobile FAB offset

The bottom nav is `position: fixed; inset: 0; z-index: 201` on mobile (<1080px).
Global rule in `global.scss` adds `margin-bottom: calc(56px + env(safe-area-inset-bottom))`
to `ion-fab[vertical="bottom"]` so FABs clear the nav bar.

---

## Navigation patterns

### Admin section — `AdminTabsComponent`

Admin pages (devices, users, logs, system) render `<app-admin-tabs>` as the first
element inside `ion-content`. The component is mobile-only (`display: none` at ≥1080px)
and shows 4 horizontal tabs with scroll + right-edge fade if content overflows.

On desktop, navigation is handled by the rail's `nav-sub` items under "Overview".

### Rail sub-navigation

`nav.ts` supports `children?: NavItem[]` on any nav item. Children render as an
indented vertical list with a left border line below the parent item. Always visible
(no toggle) — no hamburger menu in this app.

---

## UI Kit — `src/app/shared/ui`

All shared components live here. Feature code must import from `@ng/shared/ui` (the
barrel), never from Ionic directly when a kit wrapper exists.

| Component | Selector | Notes |
|---|---|---|
| `UiSearchFieldComponent` | `ui-search-field` | 38px height, debounced |
| `UiSelectComponent` | `ui-select` | 38px height; use `placeholder=` in filter bars, not `label=` |
| `MultiSelectPickerComponent` | `ui-multi-select-picker` | `ui-filter-chip` trigger, 38px |
| `FilterChipComponent` | `ui-filter-chip` | 38px height (same as inputs) |
| `BottomSheetComponent` | `ui-bottom-sheet` | Half-screen modal for pickers and multi-action menus |
| `DataTableComponent` | `ui-data-table` | Sortable, paginated, selectable |
| `MetricCardComponent` | `ui-metric-card` | KPI cards |
| `StatusBadgeComponent` | `ui-status-badge` | ONLINE / OFFLINE / etc. |
| `StatusDotComponent` | `ui-status-dot` | Inline status indicator |

### Filter bar pattern — uniform 38px height

All controls inside `.filter-row` and `.filterbar` must be 38px tall:
- `ui-search-field`: 38px ✓ (built in)
- `ui-select`: 38px ✓ (built in)
- `ui-filter-chip`: 38px ✓ (built in)
- `ion-button`: forced to 38px via global rule in `global.scss`
- `ion-button:has([slot="icon-only"])`: forced to 38×38px (square)

**Never use `label=` on a `ui-select` inside a filter bar** — the label adds height
and breaks alignment. Use `placeholder=` instead and let the dropdown label itself.

### Filter bar HTML pattern

```html
<ion-card class="filter-bar">
  <ion-card-content>
    <div class="filter-row">
      <ui-search-field placeholder="Search…" ...></ui-search-field>
      <ui-select placeholder="All Statuses" [options]="opts" ...></ui-select>
      <ion-button fill="outline" color="medium" (click)="reload()">
        <ion-icon slot="icon-only" name="reload-outline"></ion-icon>
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>
```

Wrap all filter controls in a plain `<div class="filter-row">` — do not rely on
`ion-card-content`'s shadow DOM flex for alignment.

---

## Page structure conventions

### Desktop pages with an action button

```html
<div class="pagehead">
  <div>
    <div class="pagehead__title">Page Title</div>
    <div class="pagehead__sub">Subtitle</div>   <!-- optional -->
  </div>
  <div class="pagehead__actions">               <!-- hidden on mobile via @media (max-width: 767px) -->
    <ion-button fill="solid" color="primary" (click)="onAdd()">
      <ion-icon slot="start" name="add-outline"></ion-icon>
      Add Item
    </ion-button>
  </div>
</div>
```

For mobile, the action moves to `TopbarService`. FAB is used only on non-admin pages
that already have the pattern (e.g. `/devices`).

### Admin pages

Admin pages always:
1. Inject `TopbarService`, call `topbar.set('Title', action?)` in `ngOnInit`
2. Clear via `DestroyRef.onDestroy(() => topbar.clear())`
3. Include `<app-admin-tabs>` as the first element in `ion-content`
4. Do NOT have a pagehead section (title is in the topbar on mobile, breadcrumbs on desktop)
