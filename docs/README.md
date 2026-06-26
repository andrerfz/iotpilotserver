# IoT Pilot — Documentation Index

Entry point for the `docs/` tree. **Agents: read this first** to find the right
document for a task and to follow the working conventions. The authoritative
record of *what to do* lives here in `docs/` — not in agent memory.

> Architecture overview and commands are in the root [`CLAUDE.md`](../CLAUDE.md)
> and [`apps/frontend-ng/CLAUDE.md`](../apps/frontend-ng/CLAUDE.md). This index
> covers the design/spec/backlog docs.

---

## Where to start, by task type

| If your task is… | Read first |
|---|---|
| An architectural decision | [`adr/`](adr/) — start at [`adr/README.md`](adr/README.md) |
| Implementing/changing a **bounded context** (backend domain) | [`domain/README.md`](domain/README.md) → the `domain/bc-<name>/` folder |
| Cross-BC dependencies | [`bounded-contexts.md`](bounded-contexts.md) |
| Adding a command or query (CQRS) | [`cqrs-implementation.md`](cqrs-implementation.md) |
| Domain events / event bus | [`event-driven-architecture.md`](event-driven-architecture.md) |
| DDD layering / patterns | [`ddd-patterns-guide.md`](ddd-patterns-guide.md) |
| A **frontend** feature (Angular/Ionic) | [`frontend/README.md`](frontend/README.md) → the `frontend/fe-<module>/` folder |
| The API contract | **auto-generated** from the route validators — [`openapi.generated.json`](openapi.generated.json) (enveloped) / [`openapi.client.json`](openapi.client.json) (unwrapped, drives the Angular client); served at `/api/openapi.json`. See [`openapi-autogen.md`](openapi-autogen.md) + [`iot-api-endpoints.md`](iot-api-endpoints.md) |
| Device provisioning / claiming | [`iot-provisioning-architecture.md`](iot-provisioning-architecture.md) |
| Firmware OTA | [`firmware-ota/`](firmware-ota/) |
| Multi-tenancy / auth / superadmin | [`security-implementation.md`](security-implementation.md), [`superadmin-management.md`](superadmin-management.md) |

## Module conventions (how spec docs are organized)

Two areas use a strict **4-file-per-module** convention. Keep it when adding modules.

**Backend domain** — `docs/domain/bc-<name>/`:
| File | Holds |
|---|---|
| `aggregates.md` | Aggregates, entities, value objects, invariants (design contract) |
| `commands.md` | Commands/queries the BC exposes |
| `events.md` | Domain events emitted/handled |
| `open-questions.md` | Unresolved design decisions (record the resolution + date when closed) |

**Frontend** — `docs/frontend/fe-<module>/`:
| File | Holds |
|---|---|
| `scope.md` | What the module covers + what's out of scope |
| `tasks.md` | Ordered tasks — **each task is one small PR** — with a status table |
| `acceptance.md` | Verifiable acceptance criteria / Gherkin scenarios |
| `open-questions.md` | Unresolved decisions (record resolution + date when closed) |

The index for each area (`domain/README.md`, `frontend/README.md`) carries the
per-module status table. Update the status there **and** in the module's
`tasks.md` when you finish work.

## Status legend

| Mark | Meaning |
|---|---|
| ✅ | Done — implemented and verified (tests/build green) |
| 🟡 | In progress |
| 🔴 | Pending — not started |
| ⛔ | Blocked — waiting on a decision or external prerequisite |

## Working rules for agents

1. **Docs are the source of truth for tasks**, not memory. If you discover a doc
   contradicts the code, update the doc in the same change.
2. When you complete a task, flip its status in the module `tasks.md` **and** the
   area README, and close any `open-questions.md` entry you resolved (with the
   decision + date).
3. Don't reintroduce pre-monorepo paths. Code lives in `apps/*` and
   `packages/core/src/*` — never `app/src/lib/*`.
4. Reference, don't duplicate: link to the ADR/spec rather than restating it.

## Genuinely open work

See [`frontend/README.md`](frontend/README.md) "Backlog" for the live list. As of
this writing the real remainders are:
**dependency upgrades** (separate PR), **zoneless change detection** (optional),
**macOS Capacitor app + BLE device claiming** — planned, full design in
[`frontend/fe-ble-claiming/`](frontend/fe-ble-claiming/), and **OpenAPI
auto-generation** — the spec is hand-maintained and drifts; enablement tasks in
[`openapi-autogen.md`](openapi-autogen.md).

## Reference material (historical-by-nature, fine as-is)

- [`adr/`](adr/) — architecture decision records
- [`diagrams/`](diagrams/) — PlantUML component/sequence diagrams
- [`prototype frontend/`](prototype%20frontend/) — the visual/UX contract for `frontend-ng`

## Archive

[`archive/`](archive/) holds obsolete docs kept only for history (e.g. the
completed monorepo migration backlog). **Do not treat archived docs as current.**
