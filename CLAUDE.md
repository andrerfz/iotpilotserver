# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT Pilot is a production-ready IoT device management platform built with Next.js 14, following **Domain-Driven Design (DDD)** architecture with **CQRS pattern**. It manages Raspberry Pi and similar IoT devices with real-time monitoring, SSH access, and multi-tenant support.

## Essential Commands

### Development Workflow
```bash
make fresh-setup                    # Complete fresh setup with migrations
make local-start-with-migration     # Start services with auto-migration
make dev                            # Alias for local-start
make local-restart-app              # Restart app container only
make local-recreate-app             # Recreate app with clean build
make route-list                     # List all routes (like Laravel route:list)
```

### Database Operations
```bash
make migrate                        # Run Prisma migrations in container
make db-push                        # Push schema changes
make db-status                      # Show database tables
make db-shell                       # Open PostgreSQL shell
make apply-migration                # Apply SQL migration manually
make check-and-setup-db             # Auto-check and initialize DB
```

### Testing
```bash
make test                           # Run all tests in Docker
make test-unit                      # Unit tests only
make test-integration               # Integration tests only
make test-file FILE=path/to/test    # Run specific test file
make test-debug                     # Verbose test output
make test-watch                     # Watch mode
make test-coverage                  # Generate coverage report
```

### Service Management
```bash
make local-logs-app                 # View app logs
make local-health                   # Health check
make test-db                        # Test database connection
make test-services                  # Test all service connections
```

## Architecture

### DDD Layer Structure

The codebase follows strict DDD layering with clear boundaries:

```
app/src/lib/
├── {bounded-context}/              # e.g., device, user, customer, monitoring
│   ├── domain/                     # Business logic (pure, no dependencies)
│   │   ├── entities/               # Domain entities with behavior
│   │   ├── value-objects/          # Immutable value objects
│   │   ├── services/               # Domain services
│   │   ├── events/                 # Domain events
│   │   ├── exceptions/             # Domain-specific exceptions
│   │   ├── policies/               # Business rules and policies
│   │   └── interfaces/             # Repository/service interfaces
│   │
│   ├── application/                # Use cases and orchestration
│   │   ├── commands/               # Write operations (CQRS)
│   │   │   └── {action}/
│   │   │       ├── {action}.command.ts     # Command DTO
│   │   │       └── {action}.handler.ts     # Command handler
│   │   ├── queries/                # Read operations (CQRS)
│   │   │   └── {query-name}/
│   │   │       ├── {query-name}.query.ts   # Query DTO
│   │   │       └── {query-name}.handler.ts # Query handler
│   │   └── services/               # Application services
│   │
│   └── infrastructure/             # External concerns
│       ├── repositories/           # Data persistence (Prisma)
│       ├── mappers/                # Domain ↔ Persistence mapping
│       ├── services/               # External integrations
│       └── dto/                    # Data transfer objects
│
└── shared/                         # Cross-cutting concerns
    ├── domain/                     # Base classes, interfaces
    ├── application/                # Command/Query buses, tenant context
    └── infrastructure/             # Middleware, caching, logging
```

### Key Architectural Concepts

#### 1. **CQRS Pattern**
- **Commands**: Write operations that change state (execute-ssh-command, register-device)
- **Queries**: Read operations that return data (get-device, list-devices)
- Commands and queries are processed through separate buses (`CommandBus`, `QueryBus`)
- Each command/query has its own handler implementing business logic

#### 2. **Multi-Tenancy**
- Every entity is tenant-scoped via `customerId`
- `TenantContext` tracks current tenant and enforces isolation
- `TenantScopedEntity` base class for domain entities
- Repository queries automatically filter by tenant (see `PrismaDeviceRepository`)
- SUPERADMIN role can bypass tenant restrictions

#### 3. **Value Objects**
- Immutable, validated domain primitives (e.g., `DeviceId`, `IpAddress`, `Email`)
- Validation happens in constructor, throwing exceptions on invalid data
- Use factory methods like `DeviceId.create()` or `Email.fromString()`

#### 4. **Domain Events**
- Events like `DeviceRegisteredEvent`, `UserAuthenticatedEvent`
- Published through `EventBus`
- Enables loose coupling between bounded contexts

#### 5. **Repository Pattern**
- Domain defines interfaces (e.g., `DeviceRepository`)
- Infrastructure provides implementations (e.g., `PrismaDeviceRepository`)
- Repositories accept `TenantContext` for multi-tenant filtering

### Frontend Integration (CQRS in React)

React components interact with the backend through custom hooks:

```typescript
// For commands (writes)
const { execute, loading, error } = useCommand<RegisterDeviceCommand>();
await execute(new RegisterDeviceCommand({ ... }));

// For queries (reads)
const { execute, data, loading, error } = useQuery<GetDeviceQuery, DeviceDTO>();
const device = await execute(new GetDeviceQuery({ deviceId }));
```

Hooks are located in:
- `app/src/hooks/commands/` - Command execution hooks
- `app/src/hooks/queries/` - Query execution hooks

### Database Schema

- **PostgreSQL** with Prisma ORM
- All tables support soft deletes (`deletedAt`)
- Multi-tenant via `customerId` foreign key
- Schema: `app/prisma/schema.prisma`
- Migrations: Manual SQL in `app/prisma/migration/`

Main entities:
- `Customer` - Tenant root
- `User` - Users belong to customers (nullable for SUPERADMIN)
- `Device` - IoT devices with metrics, commands, alerts
- `Alert` - Monitoring alerts
- `Threshold` - Alert thresholds
- `Session` - User sessions with expiration

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Express server (`app/server.cjs`)
- **Database**: PostgreSQL 15 with Prisma ORM
- **Caching**: Redis 7 for sessions and caching
- **Monitoring**: InfluxDB 2.x (time-series), Grafana, Loki, Prometheus
- **Real-time**: Socket.IO for device communication
- **Container**: Docker with multi-stage builds
- **Reverse Proxy**: Traefik v3 with auto-SSL
- **VPN**: Tailscale for device mesh networking
- **Testing**: Vitest with jsdom for unit/integration tests

## Development Guidelines

### When Creating New Features

1. **Domain First**: Start with domain entities, value objects, and services
2. **Application Layer**: Create command/query with handler
3. **Infrastructure**: Implement repository or external service
4. **API Route**: Wire up in Next.js API route (e.g., `app/src/app/api/devices/route.ts`)
5. **React Hook**: Create specialized hook in `hooks/commands/` or `hooks/queries/`
6. **UI Component**: Build UI using HeroUI components and custom hook

### Tenant Isolation

Always pass `TenantContext` through the application layers:
- Commands/queries should include `customerId` or accept `TenantContext`
- Repositories must filter by `customerId` unless SUPERADMIN bypass
- Use `tenantPrisma` client which auto-applies tenant filtering

### Error Handling

- Domain exceptions extend `DomainException` (e.g., `DeviceNotFoundException`)
- Throw descriptive errors with `throw new Error()` messages
- Command/query handlers catch domain exceptions and transform to API responses
- No placeholder errors or `console.error` - fix issues immediately

### Testing Best Practices

- Unit tests for domain logic (entities, value objects, services)
- Integration tests for command/query handlers
- Mock dependencies or seed database before tests
- Each test must have its own seeded data
- Verify data exists before assertions
- See `.cursor/rules/iot-pilot.mdc` for testing rules

### File Naming Conventions

- Commands: `{action}.command.ts` + `{action}.handler.ts`
- Queries: `{query}.query.ts` + `{query}.handler.ts`
- Value Objects: `{name}.vo.ts`
- Entities: `{name}.entity.ts`
- Repositories: `{impl}-{entity}.repository.ts` (e.g., `prisma-device.repository.ts`)
- Mappers: `{entity}.mapper.ts`

### Environment Configuration

- Development: `.env.local` (Docker Compose local)
- Production: `.env` (Docker Compose production)
- Copy from `.env.example` and customize
- Key variables: `DATABASE_URL`, `REDIS_URL`, `INFLUXDB_URL`, `JWT_SECRET`

## Common Patterns

### Creating a New Command

```typescript
// 1. Command DTO
export class RegisterDeviceCommand extends TenantAwareCommand {
  constructor(
    public readonly deviceId: string,
    public readonly name: string,
    public readonly ipAddress: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}

// 2. Handler
export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand> {
  async handle(command: RegisterDeviceCommand): Promise<void> {
    // Domain logic here
  }
}

// 3. Register in CommandBus
commandBus.register(RegisterDeviceCommand, new RegisterDeviceHandler(...));
```

### Creating a Repository

```typescript
// 1. Define interface in domain
export interface DeviceRepository {
  findById(id: DeviceId, tenantContext?: TenantContext): Promise<Device | null>;
  save(device: Device, tenantContext?: TenantContext): Promise<void>;
}

// 2. Implement in infrastructure
export class PrismaDeviceRepository implements DeviceRepository {
  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<Device | null> {
    const device = await tenantPrisma.client.device.findUnique({
      where: {
        id: id.getValue(),
        ...(tenantContext && {
          customerId: tenantContext.getCustomerId()?.getValue()
        })
      }
    });
    return device ? this.mapper.toDomain(device) : null;
  }
}
```

## Important Notes

- **Docker-First**: All development happens in containers. Use `docker exec iotpilot-server-app` for commands.
- **Migrations**: Apply via `make apply-migration` (manual SQL) or `make migrate` (Prisma)
- **Makefile**: Reference `Makefile` for all available commands and contexts
- **Hot Reload**: Next.js dev mode has hot reload; changes reflect automatically
- **Debugging**: Check logs with `make local-logs-app` or `docker logs iotpilot-server-app`

## Access Points (Local Development)

- Main Dashboard: `https://iotpilotserver.test:9443`
- Grafana: `http://iotpilotserver.test:3002`
- InfluxDB: `http://iotpilotserver.test:8087`
- Traefik Dashboard: `http://iotpilotserver.test:8081`

Default credentials (local):
- Email: `manager@iotpilot.app`
- Password: (bcrypt hashed in seed data)

## Further Reading

- DDD Concepts: Focus on entities, value objects, aggregates, domain services
- CQRS: Commands mutate, queries read, separate buses
- Multi-tenancy: Every operation is scoped to a customer
- Testing: Use Vitest; see `app/src/__tests__/` for examples
