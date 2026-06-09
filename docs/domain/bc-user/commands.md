# bc-user — Commands and Queries

## Existing commands (do not re-scaffold)

| Command | Handler | Notes |
|---|---|---|
| `RegisterUser` | ✅ exists | creates User + auto-creates Customer |
| `AuthenticateUser` | ✅ exists | validates credentials, creates session |
| `LogoutUser` | ✅ exists | revokes session (soft delete) |
| `RefreshSession` | ✅ exists | rotates JWT |
| `UpdateUser` | ✅ exists | admin-level field update |
| `UpdateUserProfile` | ✅ exists | self-service profile fields |
| `ApproveUser` | ✅ exists | PENDING → ACTIVE |
| `RemoveUser` | ✅ exists | soft delete |
| `CreateApiKey` | ✅ exists | — |
| `SendVerificationCode` | ✅ exists | 2FA email code |
| `VerifyTwoFactor` | ✅ exists | validates code, returns session |

## Existing queries (do not re-scaffold)

| Query | Notes |
|---|---|
| `GetUser` | by internal id |
| `GetUserById` | by public id |
| `GetCurrentUser` | from session token |
| `GetUserProfile` | profile + prefs |
| `ListUsers` | paginated, tenant-scoped |
| `ValidateSession` | session liveness check |
| `ListApiKeys` | masked keys list |

---

## New commands (need scaffolding)

### UpdateUserPreferences
- **Inputs:** `userId: string`, `customerId: string`, `category: PreferenceCategory`, `preferences: Record<string, string>`
- **Emits:** `UserPreferencesUpdatedEvent`
- **Invariant:** All keys must belong to the declared category. Values must pass VO validation for their key.
- **Route:** `PUT /api/settings/{profile|security|system|notifications}` — settings router already handles HTTP; this command formalises the domain path for the command bus
- **Note:** Settings router currently writes directly to Prisma via `tenantPrisma`. Migrating to command bus is a refactor step — the existing router behaviour is correct, the command just formalises it.

### FixSessionTimeout  _(infrastructure fix, not a new command)_
- **File:** `packages/core/src/user/infrastructure/services/user-session.service.ts`
- **Change:** Before calling `jwt.sign(…, { expiresIn: '24h' })` and `UserSession.create(…, 24)`, read `SECURITY.sessionTimeout` from `user_preferences` for the given `userId`. Fall back to 480 minutes (8h) if no preference is set.
- **Inputs:** userId (already present)
- **New dependency:** `tenantPrisma` or a `UserPreferenceRepository` interface
- **Not a command** — this is a direct fix to the service. No event emitted.

---

## New queries (need scaffolding)

### GetUserPreferences
- **Inputs:** `userId: string`, `customerId: string`
- **Returns:** `UserPreferencesDto` — all four categories merged with defaults
- **Route:** `GET /api/settings` (already exists; this query backs it via command bus)
- **Frontend use:** Called by `UserPreferencesContext` once on session start
- **Existing helper:** `getUserPreferences()` in `packages/core/src/user-preferences.ts` — the query handler should use this helper

### GetNotificationPreferences  _(cross-BC query for notification dispatchers)_
- **Inputs:** `userId: string`
- **Returns:** `{ emailNotifications: bool, alertNotifications: bool, deviceOfflineNotifications: bool, pushNotifications: bool }`
- **Route:** no HTTP route — internal query only, consumed by notification BC dispatchers
- **Purpose:** Notification dispatchers call this before sending any notification to gate on user preference

---

## Frontend architecture (new — not scaffolded via ddd-scaffold-frontend)

### UserPreferencesContext
- **File:** `apps/frontend/src/contexts/user-preferences-context.tsx`
- **Loads:** calls `GET /api/settings` on session start (after auth resolves)
- **Exposes:** `theme`, `dashboardLayout`, `itemsPerPage`, `language`, `timezone`, `dateFormat`, `emailNotifications`, `alertNotifications`, `deviceOfflineNotifications`
- **Updates:** `setPreference(category, key, value)` — calls PUT and updates local state optimistically
- **Wire-up:** Add `<UserPreferencesProvider>` inside `Providers` in `apps/frontend/src/app/providers.tsx`

### ThemeProvider
- **Not a separate component** — handled by passing `defaultTheme` to `HeroUIProvider`
- `HeroUIProvider` accepts a `defaultTheme` prop. Read `theme` from `UserPreferencesContext` and pass it.

### itemsPerPage consumption
- All paginated components that currently hardcode `limit=20` or `limit=50` should read from `useUserPreferences().itemsPerPage`
- Affected: `admin/users/page.tsx`, `admin/logs/page.tsx`, `admin/devices/page.tsx`, `devices/[id]/logs/DeviceLogsPage.tsx`

### dashboardLayout consumption
- `apps/frontend/src/components/dashboard.tsx` — read `dashboardLayout` from context and switch grid columns/density

---

## Sensitive operations
| Command | Requires |
|---|---|
| `UpdateUser` | ADMIN or self |
| `ApproveUser` | ADMIN or SUPERADMIN |
| `RemoveUser` | SUPERADMIN (cannot self-delete) |
| `UpdateUserPreferences` | self only |
| `GetNotificationPreferences` | internal (no HTTP) |
