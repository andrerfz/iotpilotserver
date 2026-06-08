# ADR-002: Separación frontend (Next.js) / backend (Express)

**Estado:** Aceptado  
**Fecha:** 2026-06-03

## Contexto

Next.js App Router mezcla páginas React y API routes en el mismo runtime bajo `app/src/app/`. Actualmente hay 53 rutas API (`route.ts`) conviviendo con 27 páginas de UI. Aunque esto es el patrón canónico de Next.js full-stack, en IoT Pilot genera dos problemas concretos:

1. **El backend ya tiene su propio servidor Express** (`server.cjs`) que añade Socket.io, BullMQ Bull Board, JWT middleware global, CORS y Helmet. Las rutas Next.js duplican parte de esa autenticación con wrappers propios (`authenticate()` + `withAuth()`).
2. **Los dispositivos IoT llaman directamente a la API** (`/api/iot/heartbeat`, `/api/iot/register`). Estos endpoints no necesitan Next.js en absoluto — son pure REST consumidos por firmware en C/MicroPython.

## Decisión

Mover todas las rutas API de Next.js a un servidor **Express puro** en `apps/backend/`.

- `apps/backend/` contiene `server.cjs` (renombrado a `server.ts` y compilado) + todas las rutas migradas.
- Las rutas se convierten del formato Next.js (`export async function GET(request: NextRequest)`) al formato Express (`router.get('/:id', handler)`).
- `apps/frontend/` es un Next.js que solo sirve páginas. Las llamadas a la API se proxian al backend (`NEXT_PUBLIC_API_URL`).
- Socket.io, BullMQ Bull Board y la autenticación JWT viven únicamente en el backend Express.

### Mapping de rutas

| Ruta Next.js (actual) | Ruta Express (objetivo) |
|---|---|
| `app/api/auth/*` | `backend/src/routes/auth/*` |
| `app/api/devices/*` | `backend/src/routes/devices/*` |
| `app/api/monitoring/*` | `backend/src/routes/monitoring/*` |
| `app/api/admin/*` | `backend/src/routes/admin/*` |
| `app/api/users/*` | `backend/src/routes/users/*` |
| `app/api/settings/*` | `backend/src/routes/settings/*` |
| `app/api/iot/*` | `backend/src/routes/iot/*` |
| `app/api/health` | `backend/src/routes/health.ts` |
| `app/api/webhook/*` | `backend/src/routes/webhook/*` |

## Consecuencias

**Positivo:**
- Un único punto de autenticación JWT (Express middleware) en lugar de dos (`withAuth` + `authenticate`).
- Los endpoints IoT no cargan el runtime de Next.js.
- El backend se puede escalar/desplegar independientemente del frontend.
- Swagger/OpenAPI se genera desde el backend sin mezclarse con la config de Next.js.

**Negativo:**
- 53 archivos `route.ts` deben convertirse a Express Router handlers — trabajo mecánico pero volumétrico.
- El frontend pasa de `fetch('/api/...')` a `fetch(process.env.NEXT_PUBLIC_API_URL + '/api/...')` — hay que actualizar todos los hooks y la configuración de CORS.
- En desarrollo local se necesitan dos procesos (`next dev` + `node backend`) en lugar de uno. El Makefile y Docker Compose deben adaptarse.

## Alternativas descartadas

- **Mantener Next.js full-stack**: no resuelve el acoplamiento de proceso ni el doble middleware de auth. Descartada.
- **BFF (Backend for Frontend)**: añadir un gateway intermedio que traduzca las llamadas. Añade una capa sin necesidad; Express ya es suficientemente ligero. Descartada.
