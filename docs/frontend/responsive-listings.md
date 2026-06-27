# Responsive listings — desktop table / mobile swipe list

## Principle: "primary platform per surface"
We keep **one codebase** with **shared logic** (services, CQRS, signals, models) and
let **presentation diverge only where the pattern genuinely differs** — chiefly
navigation (rail ↔ bottom-nav, already done) and **listings**.

Don't try to make every screen pixel-perfect on both. For each surface pick a
**primary platform** and optimize for it; the other only needs to be *usable*:

| Surface | Primary | Notes |
|---|---|---|
| Admin tables (devices, users, customers) | **Desktop** | Operator work at a desk; mobile = "good enough" |
| Device claiming (BLE), push, quick alert triage | **Mobile** | |
| Dashboard, monitoring, device detail | **Both** | Worth the responsive switch |

Tables are a desktop pattern; they cramp on phones and `<tr>` rows don't take swipe
gestures. So a listing that matters on mobile renders a **swipe list** there instead.

## The pattern
Shared data + handlers; switch presentation by viewport:

```html
@if (vp.wide()) {
  <ui-data-table [rows]="items()" [columns]="columns()" (rowClick)="openDetail($event)" …/>
} @else {
  <ui-swipe-list [items]="items()" [actions]="rowActions"
    (itemClick)="openDetail($event)" (action)="onSwipeAction($event)">
    <ng-template #itemContent let-x> …card content for a phone… </ng-template>
  </ui-swipe-list>
}
```

- **`ViewportService`** (`@ng/core/layout/viewport.service`): `wide()` / `compact()`
  signals from `matchMedia('(min-width: 1080px)')` — the shell breakpoint. Covers the
  compiled Capacitor webview by width; **no platform check**.
- **`ui-swipe-list`** (`@ng/shared/ui`): `ion-item-sliding` rows. Inputs `items`,
  `actions: SwipeAction<T>[]` (`{key,label,icon?,color?,show?}`), `key` (track fn);
  outputs `itemClick` and `action` (`{key,item}`). Row content via `#itemContent`.
- Reuse the page's existing action handlers; the desktop table is unchanged.

## Adoption backlog (the 12 `ui-data-table` views)
Migrate the **mobile-relevant** ones; leave **desktop-primary** as plain tables.

| View | Primary | Status |
|---|---|---|
| device-alerts (device detail) | Both | ✅ done (pilot) |
| monitoring (alerts) | Both | ✅ done |
| dashboard | Both | 🔴 |
| devices (list) | Both | 🔴 |
| device-overview / device-logs / device-commands (detail tabs) | Both | 🔴 |
| admin/devices, admin/users, admin/customers | Desktop | ⚪ leave (table only) |
| settings/api-keys | Desktop | ⚪ leave |

Do the 🔴 ones as each proves it's used on mobile — not all at once. Keep the desktop
table for ⚪ views.
