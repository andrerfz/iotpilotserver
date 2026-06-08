# ADR-004: Domain-Driven Design con bounded contexts

**Estado:** Aceptado — implementado  
**Fecha:** 2026-06-03

## Contexto

El codebase de IoT Pilot arrancó como un monolito Next.js sin separación de responsabilidades. La lógica de negocio, la persistencia y los controladores HTTP estaban mezclados en los mismos archivos. Al añadir multi-tenancy, SSH, métricas en tiempo real y alertas, el código se volvió difícil de razonar y probar de forma aislada.

Los síntomas concretos:
- Handlers que importaban `prismaClient` directamente y ejecutaban SQL ad-hoc.
- Validaciones de negocio dispersas entre middleware, handlers y helpers.
- Tests que mockeaban la base de datos completa porque no había forma de testear la lógica sola.
- Un cambio en el modelo de usuario rompía silenciosamente el flujo de alertas.

## Decisión

Adoptar **Domain-Driven Design (DDD)** como patrón arquitectónico principal, organizando el código en **bounded contexts** bajo `app/src/lib/`:

```
app/src/lib/
├── device/      — registro, métricas, SSH, comandos
├── user/        — autenticación, sesiones, API keys
├── customer/    — gestión de tenants, onboarding
├── monitoring/  — alertas, umbrales, métricas, informes
├── notification/ — entrega de notificaciones multi-canal
└── shared/      — clases base, buses, contexto de tenant, infraestructura compartida
```

Cada bounded context sigue la estructura de capas:

```
{context}/
├── domain/        — lógica pura, sin dependencias externas
├── application/   — casos de uso, comandos, queries
└── infrastructure/ — Prisma, HTTP clients, servicios externos
```

**Reglas de capa:**
- `domain/` no importa nada de `application/` ni `infrastructure/`.
- `application/` depende solo de interfaces definidas en `domain/`.
- `infrastructure/` implementa las interfaces de `domain/` y puede usar cualquier librería externa.
- Los bounded contexts no se importan entre sí directamente — se comunican vía eventos de dominio.

## Consecuencias

**Positivo:**
- La lógica de negocio es testeable en aislamiento sin Prisma ni HTTP.
- Un cambio en la capa de persistencia no requiere tocar el dominio.
- Cada bounded context tiene un ciclo de vida propio y puede evolucionar de forma independiente.
- Las reglas de negocio están co-localizadas con las entidades que las poseen.

**Negativo:**
- Más archivos y más indirección para cambios simples (CRUD puro).
- El patrón de capas debe respetarse activamente — la arquitectura no se auto-impone.
- Los desarrolladores nuevos necesitan familiarizarse con DDD antes de contribuir.

## Alternativas descartadas

- **Arquitectura en capas tradicional** (`controllers/`, `services/`, `repositories/`): no agrupa por dominio, lleva a que los servicios crezcan sin límite. Descartada.
- **Microservicios desde el principio**: overhead operacional excesivo para el tamaño actual del equipo. Descartada.
