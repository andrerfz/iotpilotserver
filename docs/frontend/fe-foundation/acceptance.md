# fe-foundation — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `pnpm --filter frontend-ng dev` serves; repo install (`pnpm i`) still clean for other apps |
| T2 | `lint` + `type-check` pass; an intentional `any` fails type-check (strict verified) |
| T3 | `test` runs the sample test green inside and outside Docker |
| T4 | Page renders an `ion-button` styled, plus a Tailwind-utility element, no visual bleed |
| T5 | Container serves with HMR; editing a file reflects without restart |
| T6 | All `ng-*` targets work from a clean checkout with containers running |
| T7 | Commit touching only `apps/frontend/**` skips ng hooks; touching `frontend-ng` runs them |
| T8 | `/smoke` shows `status: ok` from the real backend container |
| T9 | Built image serves the SPA; deep-link refresh (`/smoke`) returns the app, not 404 |

## Module-level scenarios

```gherkin
Feature: frontend-ng foundation

  Scenario: Developer onboards with one command
    Given a clean checkout with .env.local configured
    When the developer runs "make ng-dev"
    Then the Ionic app is served with hot reload
    And "make ng-lint", "make ng-test" and "make ng-type-check" all pass

  Scenario: New app reaches the existing backend
    Given the backend container is healthy
    When the user opens the /smoke page
    Then the page displays the backend /health response

  Scenario: Legacy frontend is unaffected
    Given the legacy Next.js dev flow ("make dev")
    When fe-foundation is merged
    Then the legacy app builds, serves and passes its hooks exactly as before
```

## Exit checklist (module → done)

- [ ] All 9 tasks merged and green in CI
- [ ] README module table updated to `done`
- [ ] Open questions all `_resolved_`
- [ ] `/fe-deepen` inputs noted: chosen versions recorded in open-questions for downstream modules
