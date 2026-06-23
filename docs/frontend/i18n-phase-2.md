# i18n — Phase 2 backlog (frontend-ng)

Status: **Phase 1 done & deployed** (commit `f4dbfed`). This doc tracks what
remains.

## Background

ngx-translate is fully wired. Locale files: `apps/frontend-ng/src/assets/i18n/{en,es,pt-br,fr,it}.json`.
Page HTML templates were already ~90% localized. The remaining gap is **literal
English passed from TypeScript into components that render `{{ value }}`**, plus
native dialogs and TS-side messages.

### Phase 1 (completed)

Shared chrome — translated once, applies everywhere:
- `nav.ts` labels → keys; rail / bottom-nav / command palette apply `| translate`.
- Shell: topbar search, user menu, tenant menu, bottom-nav, command palette (`shell.*`).
- Settings tab bar (`settings.tabs.*`) + admin tab bar (reuses `nav.*`).
- UI kit defaults: select/search placeholders, sheet Apply/Cancel, data-table
  no-data/rows/selected/clear, pickers, status & severity badges, network-status
  (`ui.*`, `status.*`, `severity.*`).
- Profile placeholders; language selector now falls back to the active UI
  language when the stored preference is unsupported (e.g. legacy `zh`).

## Phase 2 — remaining work (~220 strings, well-clustered)

### 1. Page titles — `topbar.set('…')` (~22 pages)
Literal English passed to `TopbarService.set()` renders as the mobile page title
(and desktop fallback). Convert each call to pass a translation **key**, and have
`TopbarService` / the topbar component resolve it via `translate` (reactive to
language change — prefer the pipe in the template over `instant()` captured once).

Pages: dashboard, devices, monitoring, logs; device-detail subpages (Overview,
Metrics, Terminal, Settings, Storage, Network, Commands, Alerts, Logs); settings
(Profile, Notifications, Security, System, API Keys); admin (Devices, Users,
System, Customers). Most keys already exist under `nav.*` / `device_*.*`.

### 2. Data-table column labels (~50)
`columns` arrays in feature pages carry literal `label`. The table renders them
via `{{ col.label }}`. Recommended: store a translation **key** in `label` and
have `DataTableComponent` apply `| translate` to header cells (single change
covers every table). Pages: devices, dashboard, monitoring, device-alerts,
device-commands, device-overview, device-logs, admin-devices, admin-users,
admin-customers, settings/api-keys.

### 3. `ui-select` option labels (~80)
STATUS / SEVERITY / level / role / source / timezone / date-format / layout
option arrays carry literal `label`, rendered via `{{ opt.label }}`. Same approach
as columns: keys in `label`, `| translate` in the option template. Many overlap
existing `status.*`, `severity.*`, `common.*` keys (dedupe). Pages: dashboard,
devices, monitoring, device-alerts, logs, admin-devices, admin-users,
admin-customers, admin-logs, settings-system, settings-profile, admin-new-user.

### 4. Native `AlertController` dialogs (admin, ~40)
admin-users (Approve/Reject/Suspend/Activate), admin-customers (New/Edit/
Deactivate), admin-devices (Restart): headers, messages, buttons all literal.
Resolve with `TranslateService.instant()` at call site (these are imperative).

### 5. Toast / error / success / validation messages in TS (~30)
settings-security (~9), settings-system (4), settings-notifications (3),
settings-profile (`'Changes saved'`, `'Failed to save changes'`), device-alerts
(5), device-commands (2), device-settings (3), admin-new-user validation
(`'Required'`, `'Invalid email address'`, `'Minimum 8 characters'`). Use
`TranslateService.instant()`.

### 6. Misc HTML text
- device-commands.page.html: shutdown warning + Cancel/Confirm
- device-storage.page.html: empty states (L70/L105)
- monitoring.page.html: `title="Failed to load alerts"`
- admin-logs.page.html: Previous/Next, pagination, `'Export logs'`; export column
  headers + PDF title `'System Logs'` in admin-logs.ts
- register-device-sheet / command-sheet: example placeholders (low priority — format hints)
- device-settings.page.html: numeric/value placeholders (low priority)

## Known minor bug (separate)
`shared/ui/pickers/date-range-picker.component.ts` builds the month label with
`toLocaleString('en-US', …)` → month names always render in English. Pass the
active locale instead.

## Conventions
- New keys go in all 5 locale files; keep them in sync (a small Node deep-merge
  script that never clobbers existing leaves works well — see git history of
  commit `f4dbfed`).
- Reuse `common.*`, `nav.*`, `status.*`, `severity.*` before adding new keys.
- Prefer the `translate` pipe in templates (reactive to language switch) over
  `instant()` captured in a signal/default.
- Standalone components must add `TranslatePipe` to `imports` when a template
  starts using the pipe.
- Verify with `npm run lint && npm run type-check && npx vitest run` in the
  `iotpilot-server-ng` container before committing.
