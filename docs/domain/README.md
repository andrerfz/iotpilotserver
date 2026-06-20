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
| 2 | **Loki log aggregation** | `GET /api/devices/:id/logs` and admin logs call Loki HTTP API but fall back to empty on connection error. No structured log shipping from the device agent yet. | Loki endpoint + device-agent log shipper |
| 3 | **Email notifications** | User approval/rejection flow logs the action but never sends email. `EmailChannelDispatcher` is wired but `SMTP_*` env vars are not configured in prod. | SMTP credentials in prod `.env` |
| 4 | **Customer management UI + API** | No CRUD for tenants/customers in the admin panel. `POST /api/admin/customers` and related routes are missing. Only SUPERADMIN creates customers today (via DB seed or direct SQL). | — |
| 5 | **Envelope typing in OpenAPI** | Every response is wrapped in `{ success, data, timestamp }` but the spec types bare payloads. Frontend unwraps `.data` manually on ~40 surfaces. Formal modeling would make the contract type-safe. | Decision on whether to model in spec or add a client-side interceptor |

## Feature Backlog

Planned features not yet started.

| # | Feature | Scope | Notes |
|---|---|---|---|
| 6 | **BLE auto-claim — C3 / Heltec** | `apps/backend` + device BC | macOS `.app` (Capacitor + `@capacitor-community/bluetooth-le`) scans for ESP32-C3 and Heltec temperature sensors in provisioning mode and calls `POST /api/devices/claim` automatically, bypassing manual claim flow. Requires firmware advertisement UUID on both device types. See [docs/frontend/README.md](../frontend/README.md) backlog #6. |
| 7 | **Firmware OTA** | device BC | Structure exists under `docs/firmware-ota/` but no backend endpoint or domain command implemented yet. |

## Technical Debt

| # | Item | Detail |
|---|---|---|
| 8 | **SSH TOFU — UI feedback** | When a host key mismatch is detected (possible MITM or OS reinstall), the SSH connection silently fails with a generic error. The frontend should surface a dedicated "Host key changed — update SSH credentials to re-trust" message. |
| 9 | **Command rate limit store** | `express-rate-limit` with in-memory store — resets on restart and does not work across multiple backend replicas. Swap to Redis store (`rate-limit-redis`) for production multi-instance. |
| 10 | **Prisma hot-reload in Docker** | `prisma/` is not bind-mounted in `docker-compose.local.yml` — schema changes require a container rebuild or manual `prisma generate && docker cp`. |
