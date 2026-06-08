# ADR-001: Monorepo con pnpm workspaces + Turborepo

**Estado:** Aceptado  
**Fecha:** 2026-06-03

## Contexto

IoT Pilot arrancó como un monolito Next.js con todo en `app/`: páginas React, API routes, servidor Express, worker BullMQ y los bounded contexts DDD. Tras la migración a DDD el código de dominio (`app/src/lib/`) creció hasta el punto en que la falta de separación física entre frontend, backend y worker genera rozamiento:

- Un cambio en un bounded context puede romper la build del frontend aunque el cambio no afecte a la UI.
- El worker y el backend comparten el mismo `node_modules` y el mismo `tsconfig` aunque son procesos completamente distintos.
- No hay forma de desplegar solo el worker o solo el backend sin redesplegar todo el monolito.
- Los developers frontend ven importaciones de Prisma, BullMQ y Socket.IO en la misma carpeta que los componentes React.

## Decisión

Convertir el repositorio en un **monorepo con pnpm workspaces** orquestado por **Turborepo**.

Estructura objetivo:

```
apps/
├── frontend/    → Next.js (solo pages, components, hooks — sin API routes)
├── backend/     → Express puro (todas las rutas API + server.cjs)
└── worker/      → proceso BullMQ aislado
packages/
└── core/        → bounded contexts DDD compartidos (device, user, customer, monitoring, shared)
```

Cada `app` y `package` tiene su propio `package.json`, `tsconfig.json` y ciclo de build. El monorepo gestiona las dependencias cruzadas vía workspace protocol (`"@iotpilot/core": "workspace:*"`).

## Consecuencias

**Positivo:**
- Un cambio en un bounded context solo recompila los consumidores afectados (Turborepo cache).
- Frontend, backend y worker se pueden desplegar de forma independiente.
- Los desarrolladores frontend no ven importaciones de infraestructura backend.
- La separación física refuerza la separación lógica que DDD ya establece.
- `packages/core` puede tener sus propios tests unitarios de dominio sin ninguna dependencia de framework.

**Negativo:**
- La conversión de 53 rutas Next.js (`export async function GET/POST`) a Express Router es trabajo mecánico pero no trivial.
- Se necesita configurar Turborepo, tsconfig bases y pnpm workspaces antes de poder mover código.
- El alias `@` (que apunta a `app/src/`) deja de ser válido y hay que migrar a aliases por paquete.

## Alternativas descartadas

- **Reorganización lógica dentro de `app/`** (`app/src/frontend/`, `app/src/backend/`): mejora la legibilidad pero no aísla builds ni deployments. Descartada porque no resuelve el problema de acoplamiento de ciclo de build.
- **Monorepo solo con worker separado** (Opción B): reduce el esfuerzo pero deja el frontend y el backend acoplados en el mismo proceso Next.js. Descartada porque no da la separación completa que se busca.
