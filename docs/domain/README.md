# Backend Domain — Task Backlog

Master plan for backend work in `packages/core` (DDD bounded contexts) and `apps/backend`
(Express routes, infrastructure). The frontend equivalent is [`docs/frontend/README.md`](../frontend/README.md).

Each bounded context has its own subdirectory with the four standard files:
`aggregates.md`, `commands.md`, `events.md`, `open-questions.md`.

## Bounded Contexts

| BC | Directory | Status |
|---|---|---|
| Device | [bc-device/](bc-device/) | ✅ implemented |
| User | [bc-user/](bc-user/) | ✅ implemented |
| Customer | [bc-customer/](bc-customer/) | ✅ implemented |
| Monitoring | [bc-monitoring/](bc-monitoring/) | ✅ implemented |
| Notification | [bc-notification/](bc-notification/) | ✅ implemented |

## Infrastructure Gaps (post-deploy backlog)

Known gaps where the backend returns stubs or no-ops. Ordered by user impact.

| # | Area | Detail | Blocked on |
|---|---|---|---|
| 1 | ~~**InfluxDB metrics**~~ | ✅ Done — `InfluxDBMetricsRepository` wired when env vars present, Noop fallback with warning. `GetSystemMetricsHandler` returns `{metrics, summary, availableMetrics, lastUpdated}`. | — |
| 2 | ~~**Log shipping**~~ | ✅ Done — `POST /iot/logs` endpoint (API key auth, batch up to 100 entries → DeviceLog). Agent scripts ship new log lines after each successful heartbeat (offset-tracked). | — |
| 3 | **Email notifications** | User approval/rejection flow logs the action but never sends email. `EmailChannelDispatcher` is wired but `SMTP_*` env vars are not configured in prod. | SMTP credentials in prod `.env` |
| 4 | ~~**Customer management UI + API**~~ | ✅ Done — `POST`, `PATCH /admin/customers/:id`, `DELETE /admin/customers/:id` (SUPERADMIN). Angular `/app/admin/customers` page with DataTable, search/status filters, inline create/edit/deactivate via alerts. | — |
| 5 | ~~**Envelope typing in OpenAPI**~~ | ✅ Done — `ApiSuccessResponse` and `ApiPaginatedResponse` schemas added to spec with full field typing + `PaginationMeta`. Frontend `api-response.types.ts` exports typed helpers (`ApiResponse<T>`, `ApiPaginatedResponse<T>`) for all services. Old `SuccessResponse` schema aliased for compat. | — |

## Feature Backlog

Planned features not yet started.

| # | Feature | Scope | Notes |
|---|---|---|---|
| 6 | ~~**BLE auto-claim — C3 / Heltec backend**~~ | device BC | ✅ Already implemented — `POST /api/devices/claim` with `ClaimDeviceCommand` fully wired. Frontend Capacitor macOS app is tracked in [docs/frontend/README.md](../frontend/README.md) backlog #6. |
| 7 | ~~**Firmware OTA — fw-integration layer**~~ | device BC | ✅ Done — `firmwareVersion` + `targetFirmwareVersion` columns added to Device (migration 017). `RequestFirmwareUpdateCommand` + handler registered. `POST /api/devices/:id/request-ota` (ADMIN). Heartbeat + sensor-reading responses include `firmware.targetVersion` directive when target is set. |

## Technical Debt

| # | Item | Detail |
|---|---|---|
| 8 | ~~**SSH TOFU — UI feedback**~~ | ✅ Done — executor sets `hostKeyMismatch` flag; returns `error: 'HOST_KEY_MISMATCH'` sentinel. SSH terminal component detects it and shows a specific message: "Host key mismatch — update credentials to re-establish trust." |
| 9 | ~~**Rate limit Redis store**~~ | ✅ Done — `RateLimitRedisStore` adapter (ioredis, INCR+EXPIRE NX, no new package). `server.ts` wires Redis store with in-memory fallback if Redis is unreachable at boot. |
| 10 | ~~**Prisma hot-reload in Docker**~~ | ✅ Already resolved — `prisma/` IS bind-mounted (`docker-compose.local.yml` line 108) and `start.sh` runs `prisma generate` on every start. Backlog entry was stale. |
