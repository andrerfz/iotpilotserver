# bc-user — Aggregates

## Aggregate root: User

### Identity
- `UserId` — UUID VO (exists: `user/domain/value-objects/user-id.vo.ts`)

### Fields
| Field | Type | VO | Constraints |
|---|---|---|---|
| id | string | `UserId` | UUID, immutable |
| customerId | string | `CustomerId` (shared) | UUID, tenant scope |
| email | string | `Email` | RFC 5321, unique per tenant |
| username | string | `Username` | 3–50 chars, alphanumeric + underscore |
| passwordHash | string | `Password` | bcrypt hash, never plain text |
| role | enum | `UserRole` (shared) | USER \| ADMIN \| SUPERADMIN |
| firstName | string? | `PersonName` | max 100 chars, nullable |
| lastName | string? | `PersonName` | max 100 chars, nullable |
| phoneNumber | string? | `PhoneNumber` | E.164 format, nullable |
| twoFactorEnabled | bool | — | bare bool allowed (binary flag) |
| status | enum | `UserStatus` | PENDING \| ACTIVE \| INACTIVE \| SUSPENDED |
| preferences | UserPreference[] | — | sub-entities, not a separate aggregate |

`bool` is the only allowed bare primitive. Every other field requires a named VO.

### Missing VOs (need creation)
| Field | VO to create | Constraints |
|---|---|---|
| firstName / lastName | `PersonName` | max 100, non-empty if present |
| phoneNumber | `PhoneNumber` | E.164 format or null |
| status | `UserStatus` | enum: PENDING \| ACTIVE \| INACTIVE \| SUSPENDED |

> `UserRole` already exists in shared. `Email`, `Username`, `Password` already exist in user BC.

### UserPreference sub-entity

`UserPreference` is **not** an aggregate root. It is a keyed sub-entity of `User` scoped to a category.

```
UserPreference {
  userId:   string   (FK to User)
  category: PreferenceCategory
  key:      string
  value:    string   (always stored as string; typed at read time via VO)
}
```

#### Preference VOs (need creation per category)

**SYSTEM category**
| Key | VO | Constraints |
|---|---|---|
| theme | `Theme` | enum: light \| dark \| system |
| dashboardLayout | `DashboardLayout` | enum: default \| compact \| expanded |
| itemsPerPage | `ItemsPerPage` | integer 5–100 |

**SECURITY category**
| Key | VO | Constraints |
|---|---|---|
| twoFactorAuth | — (synced to `twoFactorEnabled` bool) | — |
| sessionTimeout | `SessionTimeoutMinutes` | integer 5–1440 (minutes) |
| loginNotifications | — (bare bool string 'true'/'false') | — |

**PROFILE category**
| Key | VO | Constraints |
|---|---|---|
| language | `Language` | ISO 639-1 code, 2–5 chars |
| timezone | `Timezone` | IANA timezone string (e.g. Europe/Madrid) |
| dateFormat | `DateFormat` | enum: MM/DD/YYYY \| DD/MM/YYYY \| YYYY-MM-DD |

**NOTIFICATIONS category**
| Key | VO | Constraints |
|---|---|---|
| emailNotifications | — (bare bool string) | — |
| pushNotifications | — (bare bool string) | — |
| alertNotifications | — (bare bool string) | — |
| deviceOfflineNotifications | — (bare bool string) | — |

### UserSession sub-entity

`UserSession` is a sub-entity of `User`. A session encapsulates the JWT token and its expiry.

```
UserSession {
  id:         SessionId (UUID)
  userId:     UserId
  customerId: CustomerId?
  token:      string (JWT, opaque)
  expiresAt:  Date   (derived from SessionTimeoutMinutes preference at creation)
  createdAt:  Date
  deletedAt:  Date?  (soft delete = revoke)
}
```

**Current bug:** `UserSessionService.createSession` hardcodes `expiresIn: '24h'` and `UserSession.create(…, 24)`.
It must instead read `SECURITY.sessionTimeout` from `user_preferences` before minting the JWT.

### Status lifecycle

```
PENDING → ACTIVE → INACTIVE
                 ↘ SUSPENDED → ACTIVE
```

Transitions:
- `PENDING → ACTIVE`: admin approves registration
- `ACTIVE → INACTIVE`: admin suspends (soft)
- `ACTIVE → SUSPENDED`: admin hard-suspends
- `SUSPENDED → ACTIVE`: admin reinstates

### Invariants
- [ ] A user's email is unique within their `customerId` tenant
- [ ] A SUPERADMIN cannot delete their own account
- [ ] `twoFactorEnabled = true` requires a verified email address
- [ ] Session JWT `expiresIn` must equal `SECURITY.sessionTimeout` minutes (not hardcoded)
- [ ] Notification dispatchers must gate on user's `NOTIFICATIONS` preferences before sending

### Domain services (existing)
- `PasswordHasher` — bcrypt hash/verify
- `UserAuthenticator` — credential validation
- `ApiKeyManager` — API key creation/revocation

### BC layout (current + additions)
```
packages/core/src/user/
├── domain/
│   ├── entities/user.entity.ts                         (exists)
│   ├── entities/user-session.entity.ts                 (exists)
│   ├── value-objects/user-id.vo.ts                     (exists)
│   ├── value-objects/email.vo.ts                       (exists)
│   ├── value-objects/username.vo.ts                    (exists)
│   ├── value-objects/password.vo.ts                    (exists)
│   ├── value-objects/user-status.vo.ts                 (MISSING)
│   ├── value-objects/person-name.vo.ts                 (MISSING)
│   ├── value-objects/phone-number.vo.ts                (MISSING)
│   ├── value-objects/theme.vo.ts                       (MISSING)
│   ├── value-objects/dashboard-layout.vo.ts            (MISSING)
│   ├── value-objects/items-per-page.vo.ts              (MISSING)
│   ├── value-objects/session-timeout-minutes.vo.ts     (MISSING)
│   ├── value-objects/language.vo.ts                    (MISSING)
│   ├── value-objects/timezone.vo.ts                    (MISSING)
│   ├── value-objects/date-format.vo.ts                 (MISSING)
│   ├── interfaces/user-repository.interface.ts         (exists)
│   ├── interfaces/session-repository.interface.ts      (exists)
│   ├── exceptions/                                     (exists)
│   └── events/                                         (exists)
├── application/
│   ├── commands/...                                    (exists)
│   ├── commands/update-user-preferences/               (MISSING)
│   └── queries/
│       ├── get-user-preferences/                       (MISSING)
│       └── ...                                         (exists)
└── infrastructure/
    ├── repositories/                                   (exists)
    └── services/user-session.service.ts               (exists — needs fix)

apps/frontend/src/
├── contexts/user-preferences-context.tsx              (MISSING)
├── hooks/use-user-preferences.ts                      (MISSING)
└── app/providers.tsx                                  (needs ThemeProvider added)
```
