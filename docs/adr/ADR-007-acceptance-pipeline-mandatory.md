# ADR-007: Acceptance pipeline obligatorio tras cada bounded context

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03

## Contexto

Durante la materialización del bounded context `notification` se detectó que los BCs podían marcarse como "done" con unit tests y type-check verdes, pero sin ninguna prueba que verificara el comportamiento observable desde el exterior del BC (rutas HTTP, ciclos de estado de las entidades, invariantes de dominio visibles a través de la API).

Los tests de integración existentes (`api-routes-*.integration.test.ts`) usan mock handlers y no llaman a los route handlers reales ni a los command/query handlers de dominio. Proporcionan cobertura de contratos HTTP pero no de comportamiento de dominio.

## Decisión

Hacer **obligatorio** el paso `/acceptance-pipeline <bc-name>` como último paso de la checklist "Creating New Features" de `CLAUDE.md`.

Un BC no se considera terminado hasta que:

1. Existe un archivo `app/src/__tests__/acceptance/features/bc-{name}.feature` con escenarios Gherkin que cubren el ciclo de vida principal y las invariantes clave.
2. Existe `app/src/__tests__/acceptance/generated/bc-{name}.acceptance.test.ts` con todos los escenarios pasando contra una base de datos real.
3. Todos los valores de los ejemplos que son aserciones de dominio (status, count, flags) han sido sometidos a mutación y los tests los detectan (ninguna mutación sobrevive).

### Arquitectura de los tests de aceptación

- `runtime/StepRegistry.ts` + `AcceptanceRuntime.ts` — runtime compartido, no se modifica por BC.
- `steps/{Context}Steps.ts` — handlers inyectados con las interfaces de repositorio del BC. **Sin llamadas directas a Prisma en los pasos Then.** Sin dependencia del `ServiceContainer` (los handlers se instancian directamente para evitar el problema conocido de registro tardío en el entorno de test).
- `generated/bc-{name}.acceptance.test.ts` — generado por Claude, commiteado, no se edita a mano.

## Consecuencias

**Positivo:**
- Cada BC tiene un conjunto de tests que verifican el comportamiento observable, no la implementación interna.
- Las mutaciones garantizan que los tests tienen poder de detección real.
- La estructura Gherkin sirve como documentación viva del BC para nuevos desarrolladores.

**Negativo:**
- Añade entre 30 y 60 minutos al tiempo de materialización de un BC.
- Los tests de aceptación requieren una base de datos PostgreSQL real — no se pueden ejecutar en entornos sin Docker.

## Alternativas descartadas

- **Solo unit tests + integration tests**: los unit tests prueban implementación interna; los integration tests existentes usan mocks. Ninguno de los dos detecta regresiones en el ciclo de vida de las entidades. Descartado.
- **E2E tests con Playwright**: útil para UI, pero añade complejidad de browser automation para lo que es esencialmente un test de dominio. Descartado para este propósito.
