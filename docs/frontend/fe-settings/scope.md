# fe-settings — Scope

## Purpose

This module delivers all four settings pages (Profile, Notifications, Security, System)
and the settings hub shell for the authenticated user. When done, authenticated users can
manage their account preferences, change passwords, manage active sessions, and configure
system display options on the Ionic app with full behavioral parity to the legacy Next.js
pages. It unblocks no downstream module (no page module depends on settings), but it does
consume `ThemeService` from fe-ui-kit and `authGuard` / `AuthService` from fe-core.

## Binding upstream decisions

- **Angular standalone components + signals, no NgModules, no NgRx** →
  [fe-foundation/open-questions.md](../fe-foundation/open-questions.md)
- **All HTTP through the generated API client (`core/api/generated/`) — never
  hand-written fetch** →
  [fe-core/open-questions.md](../fe-core/open-questions.md) Q1
- **`authGuard` lives in `core/auth/guards.ts`** — settings routes are all protected by
  it →
  [fe-auth/open-questions.md](../fe-auth/open-questions.md) Q6
- **Feature pages inject services directly, no facade** →
  [fe-auth/open-questions.md](../fe-auth/open-questions.md) Q3
- **UI from `shared/ui` barrel; no direct `@ionic/angular` imports in features** →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q3
- **`ThemeService` (fe-ui-kit T2) owns dark/light/system toggle and `PUT /settings/system`
  persistence** — the system settings page calls `ThemeService.setTheme()` for the theme
  field, not the API directly →
  [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q5
- **`IonSegment`/`IonSegmentButton` (in barrel at lines 81–82) used for 3-option
  selectors; `IonRadio`/`IonRadioGroup` are NOT in the barrel** →
  [fe-settings/open-questions.md](open-questions.md) Q1 _(resolved)_
- **Settings pages render inside the `ShellComponent` (rail + topbar)** — opposite of
  auth pages which stand alone →
  [fe-auth/open-questions.md](../fe-auth/open-questions.md) Q2 (inverse)

## Target structure

```
apps/frontend-ng/src/app/features/settings/
├── pages/
│   ├── hub/
│   │   ├── settings-hub.page.ts
│   │   ├── settings-hub.page.html
│   │   ├── settings-hub.page.scss
│   │   └── settings-hub.page.spec.ts
│   ├── profile/
│   │   ├── settings-profile.page.ts
│   │   ├── settings-profile.page.html
│   │   ├── settings-profile.page.scss
│   │   └── settings-profile.page.spec.ts
│   ├── notifications/
│   │   ├── settings-notifications.page.ts
│   │   ├── settings-notifications.page.html
│   │   ├── settings-notifications.page.scss
│   │   └── settings-notifications.page.spec.ts
│   ├── security/
│   │   ├── settings-security.page.ts
│   │   ├── settings-security.page.html
│   │   ├── settings-security.page.scss
│   │   └── settings-security.page.spec.ts
│   └── system/
│       ├── settings-system.page.ts
│       ├── settings-system.page.html
│       ├── settings-system.page.scss
│       └── settings-system.page.spec.ts
└── settings.routes.ts
```

No `components/` subdirectory — all settings pages are composed of Ionic primitives from
the barrel with no feature-private reusable components at this scope.
No `services/` subdirectory — all server state is managed inline via `runQuery()` /
`api.invoke()` per page, matching the legacy pattern (no shared settings service needed).

## Legacy inventory replaced

| Legacy (`apps/frontend/src`) | Lines | Replacement |
|---|---|---|
| `app/settings/layout.tsx` | 99 | `SettingsHubPage` — ion-list sidebar nav with 4 items + `<router-outlet>` (T1) |
| `app/settings/page.tsx` | ~5 | Dropped — Angular router at `/settings` redirects to `/settings/profile` |
| `app/settings/profile/page.tsx` | 6 | Dropped — thin Next.js server-component wrapper; router points directly to `SettingsProfilePage` |
| `app/settings/profile/ProfileSettingsClient.tsx` | 284 | `SettingsProfilePage` (T2) |
| `app/settings/notifications/page.tsx` | 191 | `SettingsNotificationsPage` (T3) |
| `app/settings/security/page.tsx` | **473** → **SPLIT** | T4a: form + change password; T4b: sessions panel + recommendations (same route) |
| `app/settings/system/page.tsx` | 326 | `SettingsSystemPage` (T5) |

**Security page split rationale (473 > 400 line rule):**
The security page is 4 independent cards with distinct API surface:
- Card 1–2 (security settings form + change password): `GET/PUT /settings/security` + `PUT /auth/password` → **T4a**
- Card 3–4 (sessions panel + static recommendations): `GET/DELETE /auth/sessions` → **T4b**

Both tasks target the same `/settings/security` route. T4b extends the component and
template created by T4a.

## Endpoints consumed

| Endpoint | Method | Used by |
|---|---|---|
| `/settings/profile` | GET | Profile page (T2) — initial load |
| `/settings/profile` | PUT | Profile page (T2) — personal info save + display prefs save |
| `/settings/notifications` | GET | Notifications page (T3) — initial load |
| `/settings/notifications` | PUT | Notifications page (T3) — save |
| `/settings/security` | GET | Security page T4a — initial load |
| `/settings/security` | PUT | Security page T4a — save settings form |
| `/auth/password` | PUT | Security page T4a — change password |
| `/auth/sessions` | GET | Security page T4b — list active sessions |
| `/auth/sessions/{id}` | DELETE | Security page T4b — revoke individual session |
| `/auth/sessions` | DELETE | Security page T4b — revoke all other sessions |
| `/settings/system` | GET | System page (T5) — initial load |
| `/settings/system` | PUT | System page (T5) — save (via `ThemeService` for theme field, direct `api.invoke` for others) |

All endpoints verified in `docs/openapi.yml`. All generated client functions confirmed
in `apps/frontend-ng/src/app/core/api/generated/fn/settings/` and `fn/auth/`.

## Dependencies

- **fe-auth** — `authGuard` must be implemented before any settings route can be wired.
  `AuthService` is consumed by the security page (`wasCurrentSession` → redirect to
  `/login` after password change that invalidated the session).
- **fe-ui-kit** — `IonToggle`, `IonRange`, `IonSegment`, `IonSegmentButton`, and
  `UiSelectComponent` are all consumed. `ThemeService` (fe-ui-kit T2) is consumed by T5.

## Out of scope

- **Admin settings page** (`/settings/admin` or `/admin/system`) — the admin module
  (`fe-admin`) owns any admin-panel pages. The `isAdmin` section within `GET /settings/system`
  is part of the system settings page (T5), not admin-only routing.
- **Device SSH credentials, device-specific settings** — `fe-device-detail` /
  `fe-device-advanced`.
- **Alert threshold settings** — `fe-device-detail`.
- **Push notification registration (Capacitor)** — `fe-mobile`.
- **Settings data seeding / migration** — backend concern, not this module.
