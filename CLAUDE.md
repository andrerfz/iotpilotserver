# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT Pilot is a production-ready IoT device management platform built with Next.js 14, following **Domain-Driven Design (DDD)** architecture with **CQRS pattern**. It manages Raspberry Pi and similar IoT devices with real-time monitoring, SSH access, and multi-tenant support.

## Essential Commands

All development happens in Docker containers. The app container is `iotpilot-server-app`.

### Development
```bash
make fresh-setup                    # Complete fresh setup (nukes volumes, rebuilds)
make local-start-with-migration     # Start services with auto-migration
make dev                            # Alias for local-start
make local-restart-app              # Restart app container only
make local-recreate-app             # Rebuild app from scratch (cleans node_modules/.next)
make lint                           # Run ESLint (in container or locally)
make local-logs-app                 # View app logs
```

### Testing
```bash
make test                           # Run all tests + lint (bails on first failure)
make test-unit                      # Unit tests only
make test-integration               # Integration tests only
make test-file FILE=path/to/test    # Run specific test file (path relative to app/src/)
make test-debug                     # Verbose test output
make test-watch                     # Watch mode (interactive)
make test-coverage                  # Generate coverage report
```

Note: `make test` runs tests with `--bail=1` then runs `make lint` on success.

### Database
```bash
make migrate                        # Run Prisma migrations in container
make db-push                        # Push schema changes directly
make apply-migration                # Apply SQL migration manually (001_initial_setup.sql)
make db-shell                       # Open PostgreSQL shell
make db-status                      # Show database tables
make apply-seeds                    # Apply seed data if missing
```

### Build Verification
```bash
# Pre-commit hook runs: lint + type-check (docker exec npm run type-check)
# Pre-push hook runs: unit tests
# These require the Docker container to be running
```

## Architecture

### Monorepo Layout

```
apps/
├── frontend/   Next.js frontend (pages, components, hooks)
├── backend/    Express API server (all /api/ routes)
└── worker/     BullMQ background worker
packages/
└── core/       DDD bounded contexts shared by backend + worker
```

### Bounded Contexts

Four bounded contexts under `packages/core/src/`:
- **device** - Device registration, metrics, SSH, commands
- **user** - Authentication, sessions, API keys
- **customer** - Tenant management, onboarding
- **monitoring** - Alerts, thresholds, metrics, reports

Plus **shared** - Base classes, buses, tenant context, infrastructure

### DDD Layer Structure

Each bounded context follows:
```
{context}/
├── domain/           # Pure business logic, no external dependencies
│   ├── entities/     # Domain entities with behavior
│   ├── value-objects/ # Immutable validated primitives (*.vo.ts)
│   ├── interfaces/   # Repository/service contracts
│   ├── services/     # Domain services
│   ├── events/       # Domain events
│   ├── exceptions/   # Domain-specific exceptions
│   └── policies/     # Business rules
├── application/      # Use cases and orchestration
│   ├── commands/     # Write operations (CQRS)
│   │   └── {action}/ # {action}.command.ts + {action}.handler.ts
│   ├── queries/      # Read operations (CQRS)
│   │   └── {query}/  # {query}.query.ts + {query}.handler.ts
│   └── services/     # Application services
└── infrastructure/   # External concerns
    ├── repositories/ # Prisma implementations
    ├── mappers/      # Domain ↔ Persistence mapping
    ├── services/     # External integrations
    └── dto/          # Data transfer objects
```

### CQRS Pattern

Commands and queries are processed through separate buses (`CommandBus`, `QueryBus`) in `shared/application/bus/`. Each command/query has its own handler. Commands extend `TenantAwareCommand`, queries extend `TenantAwareQuery`.

### Multi-Tenancy

- Every entity is tenant-scoped via `customerId`
- `TenantContext` (value object in `shared/application/context/`) tracks current tenant
- `TenantScopedEntity` base class for domain entities
- Repositories automatically filter by tenant; SUPERADMIN can bypass
- Always pass `TenantContext` through application layers

### Frontend Integration

React components interact through custom hooks in `apps/frontend/src/hooks/commands/` and `apps/frontend/src/hooks/queries/`. UI uses HeroUI component library.

### Path Aliases

TypeScript/Vitest path alias: `@` maps to `apps/frontend/src/` (configured in `vitest.config.ts` and `apps/frontend/tsconfig.json`). Sub-aliases: `@/components`, `@/hooks`, `@/lib`, `@/types`, `@/utils`, `@/app`.

### Database

- **PostgreSQL** with Prisma ORM - schema at `apps/backend/prisma/schema.prisma`
- Manual SQL migrations in `apps/backend/prisma/migration/`
- All tables support soft deletes (`deletedAt`)
- Multi-tenant via `customerId` foreign key
- Main entities: `Customer`, `User`, `Device`, `Alert`, `Threshold`, `Session`

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, HeroUI — `apps/frontend/`
- **Backend**: Express.js API server — `apps/backend/` (all `/api/` routes)
- **Database**: PostgreSQL 15 with Prisma ORM
- **Caching**: Redis 7 (sessions, caching)
- **Monitoring**: InfluxDB 2.x (time-series), Grafana, Loki, Prometheus
- **Real-time**: Socket.IO
- **Testing**: Vitest with jsdom, 15s timeout
- **Container**: Docker with multi-stage builds
- **Reverse Proxy**: Traefik v3 with auto-SSL
- **DI**: tsyringe for dependency injection

## Design Documentation

Start at [`docs/README.md`](docs/README.md) — the documentation index and agent
operating guide (doc map, per-module conventions, "where to start by task type",
status legend). When planning or implementing DDD work, always consult these docs
first — they are the authoritative design contract:

| Path | When to read |
|---|---|
| `docs/README.md` | First — index + conventions + where to start for any task |
| `docs/adr/` | Before any architectural decision — ADR-001 (monorepo), ADR-002 (frontend/backend), ADR-003 (packages/core migration) |
| `docs/domain/` | Before implementing any bounded context — contains `aggregates.md`, `commands.md`, `events.md`, `open-questions.md` per BC |
| `docs/bounded-contexts.md` | When a task touches cross-BC dependencies |
| `docs/cqrs-implementation.md` | When adding commands or queries |

If `docs/domain/bc-{name}/` does not exist for the BC you're working on, use `/bc-deepen` to create it before writing code.

## Development Guidelines

### Creating New Features

1. **Domain First**: Entities, value objects, services in `domain/`
2. **Application Layer**: Command/query with handler in `application/`
3. **Infrastructure**: Repository or service implementation in `infrastructure/`
4. **Express Route**: Wire up in `apps/backend/src/routes/` (Express Router)
5. **React Hook**: Create in `apps/frontend/src/hooks/commands/` or `apps/frontend/src/hooks/queries/`
6. **UI Component**: Build with HeroUI components
7. **Acceptance Tests**: Run `/acceptance-pipeline <bc-name>` — **mandatory** after every new bounded context is materialized. A BC is not done until its acceptance tests pass and all domain-significant mutations are killed.

### File Naming

- Commands: `{action}.command.ts` + `{action}.handler.ts`
- Queries: `{query}.query.ts` + `{query}.handler.ts`
- Value Objects: `{name}.vo.ts`
- Entities: `{name}.entity.ts`
- Repositories: `{impl}-{entity}.repository.ts` (e.g., `prisma-device.repository.ts`)
- Mappers: `{entity}.mapper.ts`
- Tests: co-located in `tests/` subdirectory or `*.test.ts` next to source

### Error Handling

- Domain exceptions extend `DomainException`
- Use `throw new Error()` with descriptive messages - no placeholder errors
- Fix issues immediately, don't mask them with console.error

### Testing

- Unit tests for domain logic, integration tests for handlers
- Mock dependencies or seed database before tests
- Each test must have its own seeded data
- Verify data exists before assertions
- Tests run inside Docker container via Makefile

### Environment Configuration

- Development: `.env.local` (used by `docker-compose.local.yml`)
- Production: `.env` (used by `docker-compose.yml`)
- Copy from `.env.example` and customize
- Key variables: `DATABASE_URL`, `REDIS_URL`, `INFLUXDB_URL`, `JWT_SECRET`

### Git Hooks (Husky)

- **pre-commit**: Runs lint + TypeScript type-check in Docker container
- **pre-push**: Runs unit tests
- **lint-staged**: ESLint fix + Prettier on `*.{ts,tsx}` files
- Hooks require the Docker container to be running
