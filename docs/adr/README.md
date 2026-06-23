# Architecture Decision Records

Decisiones que afectan la estructura del proyecto. Cada ADR documenta el contexto, la decisión tomada (o pendiente) y sus consecuencias.

## Estado legend

| Estado | Significado |
|---|---|
| **_aceptado_** | Decisión tomada e implementada, en vigor. |
| **_aceptado — implementación pendiente_** | Decisión tomada y aprobada, aún no ejecutada en el codebase. |
| **_propuesto_** | Pregunta arquitectónica abierta, pendiente de decisión. |
| **_obsoleto_** | Reemplazado por otro ADR. |

---

## ADR-001 _aceptado — implementado_ — Monorepo con pnpm workspaces + Turborepo

[ADR-001](ADR-001-monorepo-pnpm-workspaces.md)

Convertir el repositorio en un monorepo `apps/backend` + `apps/frontend-ng` + `apps/worker` + `packages/core` gestionado por workspaces. Migración completada; el monorepo está en vigor.

---

## ADR-002 _aceptado — implementado_ — Separación frontend / backend (Express)

[ADR-002](ADR-002-frontend-backend-separation.md)

Las rutas API viven en un servidor Express puro en `apps/backend/`. Prerequisito de ADR-001. Migración completada.

---

## ADR-003 _aceptado — implementado_ — Bounded contexts como paquete `packages/core`

[ADR-003](ADR-003-packages-core-ddd-boundaries.md)

Los bounded contexts DDD viven en `@iotpilot/core` (`packages/core/src/`), compartido entre backend y worker. Prerequisito de ADR-001. Migración completada.

---

## ADR-004 _aceptado_ — DDD con bounded contexts como patrón arquitectónico principal

[ADR-004](ADR-004-ddd-bounded-contexts.md)

Adopción de Domain-Driven Design con 5 bounded contexts (`device`, `user`, `customer`, `monitoring`, `notification`) bajo `packages/core/src/`. Capa `domain/` sin dependencias externas, `application/` sobre interfaces, `infrastructure/` con Prisma/HTTP. Implementado.

---

## ADR-005 _aceptado_ — CQRS con buses en memoria

[ADR-005](ADR-005-cqrs-in-memory-buses.md)

`InMemoryCommandBus`, `InMemoryQueryBus` e `InMemoryEventBus`. Cada comando/query tiene un handler registrado en su `BoundedContextProvider`. Identificadores estáticos (`static readonly type`) para sobrevivir minificación. Implementado.

---

## ADR-006 _aceptado_ — Migraciones SQL manuales (sin `prisma migrate dev`)

[ADR-006](ADR-006-manual-sql-migrations.md)

Migraciones numeradas en `apps/backend/prisma/migration/*.sql`. Sin tabla `_prisma_migrations`. `prisma generate` para regenerar el cliente tras cada cambio de schema. Implementado.

---

## ADR-007 _aceptado_ — Acceptance pipeline obligatorio tras cada bounded context

[ADR-007](ADR-007-acceptance-pipeline-mandatory.md)

`/acceptance-pipeline <bc-name>` es el paso final obligatorio de la checklist de materialización de un BC. El BC no está terminado hasta que los escenarios Gherkin pasan y todas las mutaciones de dominio son detectadas. Implementado desde bc-notification.

---

## ADR-008 _aceptado_ — Propiedad y renderizado de plantillas de notificación

[ADR-008](ADR-008-notification-template-ownership.md)

Option A adoptada: `subject`/`body` hardcodeados en los event handlers para el MVP. Option B (`NotificationTemplate` configurable) planificada como feature autónoma cuando producto lo confirme.

---

## ADR-009 _aceptado — implementado_ — Comportamiento por defecto sin preferencias de notificación

[ADR-009](ADR-009-notification-tenant-defaults.md)

Option B adoptada: `ALERT_TRIGGERED` y `DEVICE_OFFLINE` habilitados por EMAIL para todos los usuarios activos sin preferencia explícita. Implementado en `NotificationRoutingService.resolveRoutes()` (`packages/core/src/notification/domain/services/`).

---

## ADR-010 _aceptado_ — Rate limiting de notificaciones

[ADR-010](ADR-010-notification-rate-limiting.md)

Option A adoptada para MVP: sin rate limiting en el BC. El cooldown de `Threshold` cubre alertas. Revisitar cuando se observen floods de dispositivos en producción.
