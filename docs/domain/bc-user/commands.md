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
| `InviteUser` | ✅ exists | ADMIN invites a teammate by email — see below |
| `AcceptInvite` | ✅ exists | public, token-driven — see below |

## InviteUser / AcceptInvite (team member invitations)

Both write directly via Prisma rather than through `UserRepository`/
`UserEntity`: the domain entity's `isActive` boolean collapses the real
ACTIVE/PENDING/SUSPENDED/INACTIVE `status` column into two states
(`UserMapper`), so it cannot express "invited, not yet accepted". Reusing
`RegisterUserCommand` would always persist ACTIVE or INACTIVE, never PENDING
— this is a known modeling gap in the User aggregate (isActive: boolean should
eventually become a real UserStatus VO), not something these two commands
attempt to fix.

- **InviteUser** (`user/application/commands/invite-user/`) — ADMIN+, tenant-
  scoped. Creates a `status: PENDING` user with an unusable random placeholder
  password hash (login is already blocked by `UserAuthenticator.
  checkIsActive()` regardless of the placeholder), a `VerificationCode` row
  (`type: 'ORG_INVITE'`, a `crypto.randomBytes(24).toString('base64url')`
  token — not the 6-digit OTP used for 2FA, since a URL token needs far more
  entropy and no code the user has to type), and emails a branded accept-
  invite link (`renderEmailLayout`). Route: `POST /users/invite`.
- **AcceptInvite** (`user/application/commands/accept-invite/`) — public, no
  tenant context (driven purely by the emailed token). Validates the token
  (unused, unexpired), sets the real password (`Password.create` — same
  strength rules as everywhere else), flips `status` to ACTIVE, marks the
  code used. Route: `POST /auth/accept-invite`.
- `PUT /users/:id` and `DELETE /users/:id` were SUPERADMIN-only; loosened to
  ADMIN (own tenant, enforced by `UserEntity.validateBelongsToTenant`) so an
  ADMIN can change a member's role or remove them. Added a last-active-ADMIN
  guard to `UpdateUserHandler`'s role-change branch, mirroring the one that
  already existed in `RemoveUserHandler`, so a role change can't zero out a
  tenant's admins the way removal already couldn't.

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
| `UpdateUser` | ADMIN (own tenant) or self (own profile fields only, not role/status) |
| `ApproveUser` | ADMIN or SUPERADMIN |
| `RemoveUser` | ADMIN (own tenant) or SUPERADMIN (cannot self-delete, cannot remove the last active ADMIN) |
| `InviteUser` | ADMIN (own tenant only) |
| `AcceptInvite` | public (gated by a single-use, time-limited token, not a role) |
| `UpdateUserPreferences` | self only |
| `GetNotificationPreferences` | internal (no HTTP) |
