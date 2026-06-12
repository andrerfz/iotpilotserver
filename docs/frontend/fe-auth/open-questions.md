# fe-auth — Open Questions

## Q1 _resolved_ — OpenAPI spec gap: `POST /auth/register` 201 response body undocumented

**Question:** The backend returns `{ requiresApproval: boolean, message: string, user: {…}, isNewCompany: boolean }` on 201, but `docs/openapi.yml` declares the 201 response with no content schema. The generated client therefore types the response as `void`, making `requiresApproval` inaccessible via `api.invoke()`.

**Impact:** Gates T5 — the register page cannot distinguish "account created" from "pending admin approval" without this flag. Both paths redirect to `/login` but show different toast messages and communicate very different UX outcomes to the user.

**Options considered:**
- **Option A (recommended):** Update `docs/openapi.yml` — add a `RegisterResponse` schema and wire it to the `POST /auth/register` 201 response. Run `make ng-api-gen` to regenerate the client. Call sites use the typed body normally. This is the correct fix: the spec should document what the backend actually returns.
- **Option B:** Use `api.invoke$Response(register, …)` which returns `StrictHttpResponse<void>`. Cast `.body as any` to access `requiresApproval`. Avoids the regen but introduces an untyped `any` cast and leaves the spec wrong — a footgun for every future caller.
- **Option C:** Collapse both outcomes to a single message ("Registration submitted. Check your email or wait for admin confirmation.") and skip the flag entirely. Simpler but degrades UX — a new company founder auto-approved shouldn't see "wait for admin confirmation."

**Recommended resolution:** Option A. The fix is two lines in the spec + a `make ng-api-gen` run. The regen is safe: only the `register` function changes, and its only caller so far is the register page (T5 itself).

---

## Q2 _resolved_ — Public page layout: no app shell

**Decision:** Login and register pages do not use the `ShellComponent` (no rail, no topbar).
They render a standalone `ion-page` + `ion-content` with a vertically centered card
(max-width 420px, matching the legacy centered layout). The legacy app is the visual
reference since the prototype has no login/register design.

**Resolved:** 2026-06-12
**Applies to:** T2, T5

---

## Q3 _resolved_ — `features/auth/` service layer: wrapper or direct injection?

**Question:** Should `features/auth/` contain an `AuthFacade` service wrapping `core/auth/AuthService`, or should pages inject `AuthService` directly?

**Decision:** Pages inject `AuthService` directly. The core service already has the exact
interface the pages need (`login()`, `verifyTwoFactor()`, `logout()`, `isAuthenticated`,
`currentUser`). A facade would be pure indirection with no added value. The no-wrapper
rule holds: don't abstract what doesn't need abstracting.

**Resolved:** 2026-06-12
**Applies to:** T2, T3, T5

---

## Q4 _resolved_ — Password visibility toggle: shared/ui or auth-private?

**Decision:** Implement show/hide toggle inline in the login and register form templates
using a local `showPassword` signal and an `IonButton` in the `ion-input` `end` slot.
No new component. The `ui-input` CVA wrapper does not need modifying — only auth pages
need this pattern, and it is 3 lines of template per field. If a third form needs it,
promote to `shared/ui` then.

**Resolved:** 2026-06-12
**Applies to:** T2, T5

---

## Q5 _resolved_ — `returnUrl` redirect after login

**Decision:** After a successful login (or 2FA verification), the login page reads
`ActivatedRoute.snapshot.queryParams['returnUrl']` and navigates there; it defaults to
`'/app'` (the shell root) when no `returnUrl` is present. This matches the `authGuard`
contract which already passes `{ queryParams: { returnUrl: state.url } }` when
redirecting to `/login`. The legacy app redirected to `'/'`; the new app's equivalent is
`'/app'` (the guarded shell entry point).

**Resolved:** 2026-06-12
**Applies to:** T2, T3

---

## Q6 _resolved_ — `loggedInGuard` placement: core/auth or features/auth?

**Decision:** `loggedInGuard` lives in `core/auth/guards.ts` alongside `authGuard` and
`roleGuard`. It is the symmetric inverse of `authGuard` (if authenticated → redirect to
`/app`). Keeping all route guards in one file makes them easy to audit and consistent
with the existing pattern. It is not feature-specific routing logic — it is a core
authentication concern.

**Resolved:** 2026-06-12
**Applies to:** T1
