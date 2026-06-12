# fe-auth — Scope

## Purpose

Builds the two public-facing authentication pages — login (with inline 2FA) and register
— on top of the headless `AuthService` already delivered by fe-core. When done, the app
has a complete authentication flow: anonymous users land on `/login`, authenticated users
reach the guarded `/app` shell, and registration creates a new account (or submits it for
admin approval). This module unblocks fe-settings (requires auth context) and is a
soft prerequisite for every other page module.

## Binding upstream decisions

- Bearer token transport + in-memory storage (web) → [fe-core/open-questions.md](../fe-core/open-questions.md) Q2.
  Login page must NOT persist the token to `localStorage`; bootstrap restore is the
  cookie+refresh path, not a stored token read.
- `AuthService` is the single login/logout/verifyTwoFactor/me service —
  feature code injects it directly; no wrapper service in `features/auth/`. → Q3 below.
- Generated API client with explicit `operationId`s (e.g. `register`, `login`) → [fe-core/open-questions.md](../fe-core/open-questions.md) Q6.
- UI from `shared/ui` barrel; never import `@ionic/angular` directly in feature code → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q3.
- Standalone components + signals, no NgModules, no NgRx → [fe-foundation/open-questions.md](../fe-foundation/open-questions.md).
- Visual contract: prototype (`docs/prototype frontend/`) is the design reference; legacy
  Next.js app is the behavioral parity reference. The prototype has **no login/register
  page design**, so the legacy layout is the visual reference too → [fe-ui-kit/open-questions.md](../fe-ui-kit/open-questions.md) Q7.

## Target structure

```
apps/frontend-ng/src/app/
├── core/auth/
│   ├── auth.service.ts          ← already done (fe-core T5)
│   ├── guards.ts                ← authGuard done; add loggedInGuard here (T1)
│   ├── token.storage.ts         ← done
│   └── auth.interceptor.ts      ← done
└── features/
    └── auth/
        ├── pages/
        │   ├── login/
        │   │   ├── login.page.ts
        │   │   ├── login.page.html
        │   │   ├── login.page.scss
        │   │   └── login.page.spec.ts
        │   └── register/
        │       ├── register.page.ts
        │       ├── register.page.html
        │       ├── register.page.scss
        │       └── register.page.spec.ts
        └── components/
            └── password-strength/
                ├── password-strength.component.ts
                ├── password-strength.component.html
                ├── password-strength.component.scss
                └── password-strength.component.spec.ts
```

No `services/` directory: the `core/auth/AuthService` is the auth service.
Feature auth only adds pages and a private UI component.

## Legacy inventory replaced

| Legacy (apps/frontend/src) | Lines | Replacement |
|---|---|---|
| `app/login/page.tsx` | 8 | `features/auth/pages/login/login.page.ts` |
| `app/login/TwoFactorForm.tsx` | 100 | Inline step in `login.page` (state machine `'credentials' \| '2fa'`) |
| `app/register/page.tsx` | 8 | `features/auth/pages/register/register.page.ts` |
| `components/login-form.tsx` | 126 | `login.page` template (reactive form) |
| `components/login-page.tsx` | 98 | `login.page` (layout + card) |
| `components/password-input.tsx` | 69 | Show/hide toggle inline in form templates (no separate component) |
| `components/password-requirements.tsx` | 63 | `components/password-strength/password-strength.component.ts` |
| `components/protected-route.tsx` | 74 | `authGuard` (already done in fe-core T6) |
| `components/register-page.tsx` | 37 | `features/auth/pages/register/register.page.ts` |
| `components/registration-form.tsx` | 131 | `register.page` template (reactive form) |
| `contexts/auth-context.tsx` | ~160 | `core/auth/AuthService` (done) |
| `hooks/commands/use-user-commands.ts` | ~40 | direct `AuthService` injection |

**Total legacy replaced:** ~714 lines across 12 files. All replacements are in the 90–200
line range individually — no file exceeds 400 lines; no split required.

## Endpoints consumed

| Endpoint | operationId | Used by |
|---|---|---|
| `POST /auth/login` | `login` | LoginPage (T2) |
| `POST /auth/verify-2fa` | `verifyTwoFactor` | LoginPage 2FA step (T3) |
| `POST /auth/logout` | `logout` | UserMenu (shell — already wired) |
| `POST /auth/register` | `register` | RegisterPage (T5) |
| `GET /auth/me` | `getMe` | AuthService.me() — called by app bootstrap |
| `POST /auth/refresh` | `refreshSession` | AuthService.refresh() — called by interceptor |

All endpoints exist in `docs/openapi.yml`. **Note:** the `register` 201 response body
is undocumented in the spec (backend returns `{ requiresApproval, message, user }`
but the spec has no content schema). See open-questions.md Q1.

## Dependencies

- **fe-core**: `AuthService`, `TokenStorage`, `authGuard`, `authInterceptor`, generated
  API client — all required before writing any auth page.
- **fe-ui-kit**: `shared/ui` barrel components (`IonButton`, `IonCard*`, `IonInput`, etc.),
  `ui-input` (CVA wrapper), `ui-checkbox` — required for form templates.

## Out of scope

- Session management UI (list/revoke sessions) → fe-settings
- Password change → fe-settings
- API key management → fe-settings
- 2FA enable/disable settings → fe-settings
- Admin user-approval flow (the admin sees pending accounts) → fe-admin
- Capacitor SecureStorage token persistence → fe-mobile
