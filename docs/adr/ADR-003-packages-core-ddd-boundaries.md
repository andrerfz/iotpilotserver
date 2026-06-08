# ADR-003: Bounded contexts DDD como paquete compartido `packages/core`

**Estado:** Aceptado  
**Fecha:** 2026-06-03

## Contexto

Los bounded contexts DDD (`device`, `user`, `customer`, `monitoring`, `shared`) viven en `app/src/lib/`. Tanto el backend (API routes) como el worker (BullMQ jobs) los consumen. Con la separación en monorepo (ADR-001), estos contextos no pertenecen ni al frontend ni al backend — son lógica de dominio pura que necesitan ambos procesos.

## Decisión

Extraer los cinco bounded contexts a un paquete compartido `packages/core` con nombre npm `@iotpilot/core`.

```
packages/core/
├── src/
│   ├── device/      → domain, application, infrastructure
│   ├── user/        → domain, application, infrastructure
│   ├── customer/    → domain, application, infrastructure
│   ├── monitoring/  → domain, application, infrastructure
│   └── shared/      → base classes, buses, tenant context, DI container
├── package.json     → name: "@iotpilot/core"
├── tsconfig.json
└── vitest.config.ts → tests unitarios de dominio aislados
```

`apps/backend` y `apps/worker` declaran `"@iotpilot/core": "workspace:*"` en su `package.json`. `apps/frontend` solo importa tipos públicos de `@iotpilot/core` (value objects, DTOs) — nunca infraestructura (Prisma, BullMQ).

### Regla de visibilidad

| Capa | Puede importar de `@iotpilot/core` | No puede importar |
|---|---|---|
| `apps/frontend` | Tipos públicos, enums, value objects | Repositorios, Prisma, servicios de infraestructura |
| `apps/backend` | Todo | — |
| `apps/worker` | Todo | — |

## Consecuencias

**Positivo:**
- Los tests unitarios de dominio (107 actualmente) se ejecutan en `packages/core` sin depender de Next.js ni Express.
- Un cambio en un bounded context dispara solo los builds de `backend` y `worker`, no el del frontend.
- La frontera de `packages/core` hace explícito qué es lógica de negocio y qué es infraestructura de aplicación.

**Negativo:**
- Prisma está en `app/prisma/` actualmente; hay que decidir si `packages/core` tiene su propio cliente Prisma generado o si el backend se lo inyecta. Decisión: el schema y el cliente Prisma viven en `apps/backend`, y `packages/core` recibe el cliente por inyección de dependencias (ya usa tsyringe — sin cambios).
- El alias `@/lib/...` deja de ser válido. Todos los imports deben migrar a `@iotpilot/core/device/...` etc.

## Alternativas descartadas

- **Copiar el código en cada app** (backend y worker tienen su propia copia de `lib/`): divergencia garantizada. Descartada.
- **Domain en `apps/backend`, worker importa desde backend**: crea dependencia circular entre apps. Descartada.
