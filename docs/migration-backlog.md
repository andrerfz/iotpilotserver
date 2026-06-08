# Migration Backlog — Monorepo Restructuring

Tracking list para la migración de monolito Next.js → monorepo pnpm + Turborepo.  
Decisiones de arquitectura documentadas en [`docs/adr/`](./adr/).

## Status legend

| Marca | Significado |
|---|---|
| ✅ **Completado** | Implementado y verificado (tests verdes, build OK). |
| 🟡 **En progreso** | Trabajo iniciado, no completado. |
| 🔴 **Pendiente** | No iniciado. Necesita la fase anterior para arrancar. |
| ⛔ **Bloqueado** | Esperando una decisión o un prerequisito externo. |

## Pipeline de fases

```
🔴 Fase 1 (Infraestructura monorepo)
  └─▶ 🔴 Fase 2 (packages/core)
        └─▶ 🔴 Fase 3 (apps/worker)
              └─▶ 🔴 Fase 4 (apps/backend)
                    └─▶ 🔴 Fase 5 (apps/frontend)
                          └─▶ 🔴 Fase 6 (Integración Docker/Makefile)
                                └─▶ 🔴 Fase 7 (Tests y verificación)
```

---

## Fase 1 — Infraestructura monorepo 🔴

> Prerrequisito de todo lo demás. Sin esto no existe el workspace.

| Tarea | Detalle | Estado |
|---|---|---|
| **1.1** Inicializar pnpm workspaces | `pnpm-workspace.yaml` con `apps/*` y `packages/*` en la raíz del repo | 🔴 |
| **1.2** Instalar y configurar Turborepo | `turbo.json` con pipelines `build`, `test`, `lint`, `dev` | 🔴 |
| **1.3** tsconfig base compartido | `tsconfig.base.json` en raíz con `paths` y `strict: true` | 🔴 |
| **1.4** Root `package.json` | Mover scripts de Makefile a npm scripts; mantener Makefile como alias | 🔴 |
| **1.5** Crear directorios vacíos | `mkdir -p apps/frontend apps/backend apps/worker packages/core` | 🔴 |

---

## Fase 2 — `packages/core` (bounded contexts DDD) 🔴

> Mueve `app/src/lib/` → `packages/core/src/`. Ver [ADR-003](./adr/ADR-003-packages-core-ddd-boundaries.md).

| Tarea | Detalle | Estado |
|---|---|---|
| **2.1** Scaffold `packages/core` | `package.json` (`@iotpilot/core`), `tsconfig.json`, `vitest.config.ts` | 🔴 |
| **2.2** Mover `lib/shared` | Base classes, buses (`CommandBus`, `QueryBus`, `EventBus`), `TenantContext`, `AppContainer` | 🔴 |
| **2.3** Mover `lib/device` | Bounded context device completo (domain + application + infrastructure) | 🔴 |
| **2.4** Mover `lib/user` | Bounded context user completo | 🔴 |
| **2.5** Mover `lib/customer` | Bounded context customer completo | 🔴 |
| **2.6** Mover `lib/monitoring` | Bounded context monitoring completo | 🔴 |
| **2.7** Actualizar alias `@/lib/...` | Migrar todos los imports `@/lib/device/...` → `@iotpilot/core/device/...` en el repo | 🔴 |
| **2.8** Verificar tests unitarios en core | `pnpm --filter @iotpilot/core test` — los 107 tests deben estar verdes | 🔴 |

**Archivos afectados:** todo `app/src/lib/` (~500 archivos estimados).  
**Decisión de Prisma:** el schema y el cliente generado permanecen en `apps/backend`. `packages/core` recibe `PrismaClient` por DI (tsyringe) — sin cambios en la lógica de inyección.

---

## Fase 3 — `apps/worker` 🔴

> Aislar el proceso BullMQ. Depende de Fase 2 (necesita `@iotpilot/core`).

| Tarea | Detalle | Estado |
|---|---|---|
| **3.1** Scaffold `apps/worker` | `package.json`, `tsconfig.json`, depende de `@iotpilot/core` | 🔴 |
| **3.2** Mover `app/src/worker.ts` | → `apps/worker/src/worker.ts` | 🔴 |
| **3.3** Actualizar imports en worker | `@/lib/...` → `@iotpilot/core/...` | 🔴 |
| **3.4** Dockerfile para worker | Derivado del Dockerfile actual; punto de entrada `node worker.js` | 🔴 |
| **3.5** Smoke test del worker | Arrancar en Docker, enviar un job de prueba, verificar procesamiento | 🔴 |

---

## Fase 4 — `apps/backend` (Express + 53 rutas) 🔴

> La fase más volumétrica. Convierte las API routes de Next.js a Express Router. Ver [ADR-002](./adr/ADR-002-frontend-backend-separation.md).

### 4.1 Scaffold y servidor base

| Tarea | Detalle | Estado |
|---|---|---|
| **4.1.1** Scaffold `apps/backend` | `package.json`, `tsconfig.json`, depende de `@iotpilot/core` | 🔴 |
| **4.1.2** Migrar `server.cjs` → `server.ts` | Convertir a TypeScript; mantener Socket.io, BullMQ Bull Board, JWT, CORS, Helmet, Winston | 🔴 |
| **4.1.3** Mover schema Prisma | `app/prisma/` → `apps/backend/prisma/`; actualizar `DATABASE_URL` en envs | 🔴 |
| **4.1.4** Middleware compartido | `authenticate()`, `withAuth()`, `withSuperAdmin()` → `apps/backend/src/middleware/` | 🔴 |

### 4.2 Migración de rutas (53 archivos)

Conversión de formato Next.js (`export async function GET(req: NextRequest)`) a Express (`router.get('/', handler)`).

| Grupo | Rutas | Archivos | Estado |
|---|---|---|---|
| **auth** | `/api/auth/*` | login, logout, me, register, refresh, session, sessions, sessions/[id], password, api-keys, verify-2fa | 11 | 🔴 |
| **devices** | `/api/devices/*` | root, [id], [id]/alerts, [id]/alerts/[alertId], [id]/commands, [id]/commands/[commandId], [id]/logs, [id]/metrics, [id]/settings, [id]/ssh, [id]/status, activate, bulk, claim, register, tailscale-register | 16 | 🔴 |
| **monitoring** | `/api/monitoring/*` | alerts, alerts/[id], metrics, reports, thresholds | 5 | 🔴 |
| **admin** | `/api/admin/*` | devices, logs, system, users, users/[id]/approve | 5 | 🔴 |
| **users** | `/api/users/*` | root, [id], [id]/profile, current | 4 | 🔴 |
| **settings** | `/api/settings/*` | root, notifications, profile, security, system | 5 | 🔴 |
| **iot** | `/api/iot/*` | heartbeat, register | 2 | 🔴 |
| **misc** | health, heartbeat, docs, docs/ui, webhook/temperature | 5 | 🔴 |

### 4.3 Verificación

| Tarea | Detalle | Estado |
|---|---|---|
| **4.3.1** Tests de integración de rutas | Todos los handlers existentes deben tener test equivalente en Express | 🔴 |
| **4.3.2** Smoke test manual con curl | Verificar auth flow, device CRUD, monitoring alerts | 🔴 |

---

## Fase 5 — `apps/frontend` (Next.js pages-only) 🔴

> Depende de Fase 4 (necesita la URL del backend para configurar el proxy).

| Tarea | Detalle | Estado |
|---|---|---|
| **5.1** Scaffold `apps/frontend` | Mover `app/` (Next.js) a `apps/frontend/`; eliminar carpeta `src/app/api/` | 🔴 |
| **5.2** Actualizar `next.config.js` | Eliminar referencias a API routes; añadir `rewrites` o `NEXT_PUBLIC_API_URL` para proxy | 🔴 |
| **5.3** Migrar hooks a `NEXT_PUBLIC_API_URL` | `fetch('/api/...')` → `fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/api/...\`)` en todos los hooks | 🔴 |
| **5.4** Mover `app/src/types/` | → `apps/frontend/src/types/` (tipos que no son de dominio) | 🔴 |
| **5.5** Mover `app/src/context/` | → `apps/frontend/src/context/` (providers CQRS del frontend) | 🔴 |
| **5.6** Mover `app/src/contexts/` | → `apps/frontend/src/contexts/` (auth context React) | 🔴 |
| **5.7** CORS en backend | Añadir el origen del frontend (`http://localhost:3000`) en la whitelist de CORS del backend | 🔴 |
| **5.8** Smoke test UI | Login → lista de devices → detalle de device → SSH terminal | 🔴 |

**Nota sobre `@iotpilot/core` en frontend:** el frontend solo puede importar tipos públicos (enums, value objects como strings/numbers). No debe importar clases de infraestructura (repositorios, servicios con Prisma).

---

## Fase 6 — Integración Docker / Makefile 🔴

> Adaptar la infraestructura de desarrollo y producción a los tres procesos separados.

| Tarea | Detalle | Estado |
|---|---|---|
| **6.1** `docker-compose.local.yml` | Tres servicios: `iotpilot-frontend`, `iotpilot-backend`, `iotpilot-worker` | 🔴 |
| **6.2** `docker-compose.yml` (producción) | Idem para producción con imágenes multi-stage | 🔴 |
| **6.3** Dockerfiles individuales | `apps/frontend/Dockerfile`, `apps/backend/Dockerfile`, `apps/worker/Dockerfile` | 🔴 |
| **6.4** Traefik routing | Frontend en `/` (puerto 3000), backend en `/api/` (puerto 3001), BullBoard en `/admin/queues` | 🔴 |
| **6.5** Variables de entorno | `.env.example` actualizado; `NEXT_PUBLIC_API_URL`, `BACKEND_PORT`, etc. | 🔴 |
| **6.6** Makefile | Actualizar targets: `make dev` arranca los tres procesos; `make test` ejecuta tests por workspace | 🔴 |

---

## Fase 7 — Tests y verificación final 🔴

| Tarea | Detalle | Estado |
|---|---|---|
| **7.1** Tests unitarios `packages/core` | `pnpm --filter @iotpilot/core test` — 107 tests verdes | 🔴 |
| **7.2** Tests integración `apps/backend` | Todos los handlers de rutas | 🔴 |
| **7.3** Type-check global | `pnpm turbo type-check` sin errores en ningún workspace | 🔴 |
| **7.4** Lint global | `pnpm turbo lint` sin errores | 🔴 |
| **7.5** Build de producción | `pnpm turbo build` — los tres apps deben compilar | 🔴 |
| **7.6** Smoke test end-to-end | Login → gestión de device → SSH → alertas en UI usando backend separado | 🔴 |

---

## Resumen de scope

| Artefacto | Cantidad | Fase |
|---|---|---|
| API routes a convertir | 53 archivos | Fase 4 |
| Páginas UI a mover | 27 directorios | Fase 5 |
| Hooks con `fetch('/api/...')` a actualizar | ~20 hooks | Fase 5 |
| Bounded contexts a extraer | 5 (`device`, `user`, `customer`, `monitoring`, `shared`) | Fase 2 |
| Tests unitarios a preservar | 107 | Fase 7 |
| Dockerfiles a crear/actualizar | 3 nuevos + 2 existentes | Fase 6 |

**Estimación:** 3–4 semanas a tiempo parcial. La Fase 4 (conversión de rutas) es el cuello de botella — representan ~60% del trabajo.
