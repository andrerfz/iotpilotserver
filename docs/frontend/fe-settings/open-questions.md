# fe-settings — Open Questions

## Q1 _resolved_ — Theme selector: IonRadio vs IonSegment

**Question:** The legacy system settings page uses a radio group (3 options: light, dark,
system) for theme selection. `IonRadio`/`IonRadioGroup` are NOT exported from the
`shared/ui` barrel (`apps/frontend-ng/src/app/shared/ui/index.ts`). Two replacement
options exist:

- **Option A:** Add `IonRadio`, `IonRadioGroup` to the `shared/ui` barrel and use them
  for the theme selector.
- **Option B (chosen):** Use `IonSegment`/`IonSegmentButton` which ARE already in the
  barrel (lines 81–82). A 3-option segment is idiomatic Ionic for a small mutually-
  exclusive choice set and fits the mobile-first design better than a radio group for
  exactly 3 options.

**Decision:** Use `IonSegment` + 3 `IonSegmentButton` items for the theme selector
(`light` | `dark` | `system`). No barrel changes required. `IonRadio`/`IonRadioGroup`
are not needed by any current fe-settings task; if a future module needs them, that
module's deepen step should add them to the barrel then.

**Resolved:** 2026-06-12
**Applies to:** T5

---

## Q2 _resolved_ — Settings pages use the app shell (ShellComponent)

**Decision:** All settings pages render inside the `ShellComponent` (ion-split-pane with
side rail and topbar). This is the opposite of auth pages (fe-auth Q2), which stand alone.
The `SettingsHubPage` is itself a child of the shell-wrapped `/app` route group. The
`authGuard` on the settings routes enforces authentication; unauthenticated requests are
redirected to `/login?returnUrl=…`.

**Resolved:** 2026-06-12
**Applies to:** T1–T5

---

## Q3 _resolved_ — Dual-form PUT: always send the full merged profile payload

**Question:** The legacy `ProfileSettingsClient.tsx` fetches `GET /settings/profile` on
mount, then on every save (personal or display) sends the full merged object including
both sections. This means saving personal info also re-sends the current display prefs
and vice versa. Should the Angular version match this or use PATCH semantics?

**Decision:** Match the legacy behavior exactly — each save sends the full merged
payload. Both forms read from each other's `getRawValue()` before calling
`PUT /settings/profile`. The backend's `PUT /settings/profile` is a full replace, not a
partial update (the spec does not define a PATCH endpoint for this resource). Changing
to partial would require a backend change; parity is the safer default.

**Resolved:** 2026-06-12
**Applies to:** T2

---

## Q4 _resolved_ — Security page split across two tasks (T4a, T4b) — same route, one component

**Decision:** The security page's 473 lines exceed the 400-line split rule. It is split
into two tasks but they target the **same route** (`/settings/security`) and the
**same component** (`SettingsSecurityPage`). T4a creates the component with Cards 1–2;
T4b extends it with Cards 3–4. The component is never a placeholder-only file between
T4a and T4b merges (T4a already delivers a usable page). T4b is dependent on T4a.

**Resolved:** 2026-06-12
**Applies to:** T4a, T4b

---

## Q5 _resolved_ — ThemeService owns PUT /settings/system for theme field

**Decision:** `ThemeService` (implemented in fe-ui-kit T2) calls `PUT /settings/system`
internally when `setTheme()` is called. The system settings page (T5) calls
`ThemeService.setTheme(value)` on segment change and does NOT call `api.invoke`
directly for the theme field. The display-save button sends only `{ dashboardLayout,
itemsPerPage }` — it explicitly excludes `theme`. This avoids a double-write race where
both the service and the page could call the same endpoint for the same field.

This inherits from [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q5.

**Resolved:** 2026-06-10 (fe-ui-kit) / confirmed 2026-06-12 for fe-settings
**Applies to:** T5
