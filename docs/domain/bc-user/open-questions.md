# bc-user — Open Questions

## Q1 _resolved_ — Settings router bypasses command bus

**Decision:** The existing `settings.router.ts` writes directly to `tenantPrisma` without going through the command bus. This is acceptable as an infrastructure shortcut since the settings data (`user_preferences` table) is a pure persistence concern with no domain invariants beyond field validation (which the router already does via Zod). Migrating to `UpdateUserPreferencesCommand` is a refactor, not a blocker.

**Resolved:** 2026-06-09
**Applies to:** `UpdateUserPreferences` command — treat as optional refactor, not required to unblock the frontend gaps.

---

## Q2 _resolved_ — Session timeout: minutes vs hours

**Decision:** Store `sessionTimeout` as integer minutes (5–1440). The JWT `expiresIn` must be set to `${minutes}m` notation. `UserSession.create()` second parameter (currently `24` meaning hours) must change to accept minutes and convert internally. Default fallback: 480 minutes (8h) if no preference found — matches current 24h behaviour approximately and is a safer default than 30m.

**Resolved:** 2026-06-09
**Applies to:** `FixSessionTimeout` in `user-session.service.ts`, `SessionTimeoutMinutes` VO

---

## Q3 _resolved_ — ThemeProvider: HeroUI approach

**Decision:** `HeroUIProvider` accepts a `defaultTheme` prop (`'light' | 'dark' | 'system'`). The `UserPreferencesContext` loads on session start and provides the `theme` value. `providers.tsx` reads from context and passes to `HeroUIProvider`. No separate ThemeProvider component needed.

**Constraint:** `UserPreferencesContext` must be inside `AuthProvider` (needs session to exist) but outside `HeroUIProvider` (HeroUI needs the theme value). This requires restructuring `providers.tsx` or using a two-phase render pattern.

**Resolved:** 2026-06-09
**Applies to:** `UserPreferencesContext` wiring in `providers.tsx`

---

## Q4 _pending_ — Language/i18n: which library?

**Question:** The `language` preference is saved but there is no i18n library in the project. Applying language requires either `next-intl`, `react-i18next`, or `i18next`. Which one?

**Impact:** Non-blocking for current sprint — `language` can be saved without being applied until the i18n library is chosen. Do NOT implement language switching without resolving this.

**Options considered:**
- Option A: `next-intl` — integrates well with App Router, message files per locale
- Option B: `react-i18next` — more flexible, heavier setup
- Option C: Defer entirely — show the preference UI but don't apply it yet (mark as "coming soon")

---

## Q5 _pending_ — Timezone: apply where?

**Question:** The `timezone` preference is saved but the app displays dates via `new Date().toLocaleString()` scattered across many components. Applying timezone globally requires either a date context or a formatting utility that reads from `UserPreferencesContext`.

**Impact:** Non-blocking for current sprint — `timezone` can be saved without being applied. Apply only after the `UserPreferencesContext` is wired.

**Options considered:**
- Option A: Create `formatDate(date, { timezone, format })` utility that reads from context — component-level adoption
- Option B: Wrap all date display in a `<FormattedDate>` component — centralised
- Option C: Use `date-fns-tz` with context-provided timezone

---

## Q6 _resolved_ — Notification gate: where does it live?

**Decision:** The notification gating logic (check `emailNotifications`, `alertNotifications`, etc. before dispatching) belongs in the **notification BC**, not the user BC. The user BC exposes `GetNotificationPreferencesQuery` as an internal query. The notification BC dispatchers call it before sending.

**Resolved:** 2026-06-09
**Applies to:** `GetNotificationPreferences` query, notification BC dispatcher refactor (see `docs/domain/bc-notification/`)

---

## Q7 _pending_ — itemsPerPage: which lists consume it?

**Question:** Four pages are candidates for `itemsPerPage` from preferences: `admin/users`, `admin/logs`, `admin/devices`, `devices/[id]/logs`. But some have their own local pagination state. Should `itemsPerPage` be a global default (changeable per-list) or a strict global override?

**Impact:** Non-blocking for first implementation — apply as a global default (initial value for `useState`) and allow per-list override.

**Options considered:**
- Option A: Global default only — `itemsPerPage` sets the initial `useState` value, user can still change per-list
- Option B: Strict global — lists always use context value, no local override
