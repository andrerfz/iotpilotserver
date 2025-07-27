# IoT Pilot Server - Domain-Driven Design Architecture

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Domain-Driven Design Implementation](#domain-driven-design-implementation)
4. [Bounded Contexts](#bounded-contexts)
5. [CQRS Architecture](#cqrs-architecture)
6. [Event-Driven Architecture](#event-driven-architecture)
7. [Technology Stack](#technology-stack)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Security Architecture](#security-architecture)
10. [Monitoring & Observability](#monitoring--observability)

## Overview

IoT Pilot Server is a production-ready IoT device management platform built with **Domain-Driven Design (DDD)** architecture following **CQRS pattern** and **multi-tenancy**. The system manages Raspberry Pi and similar IoT devices with real-time monitoring, SSH access, and comprehensive device lifecycle management.

### Key Characteristics

- **Domain-Driven**: Business logic organized around domain concepts
- **CQRS**: Separate read and write models for optimal performance
- **Multi-Tenant**: Complete tenant isolation with SUPERADMIN capabilities
- **Event-Driven**: Asynchronous communication between bounded contexts
- **Microservices-Ready**: Modular architecture supporting future decomposition
- **Production-Grade**: Comprehensive monitoring, logging, and error handling

## Architecture Principles

### 1. Domain-Driven Design (DDD)

The codebase follows strict DDD layering with clear boundaries:

```
app/src/lib/
├── {bounded-context}/              # e.g., device, user, customer, monitoring
│   ├── domain/                     # Business logic (pure, no dependencies)
│   │   ├── entities/               # Domain entities with behavior
│   │   ├── value-objects/           # Immutable value objects
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

### 2. CQRS Pattern

**Commands** (Write Operations):
- Mutate application state
- Are validated and authorized
- Publish domain events
- Are processed by command handlers
- Examples: `RegisterDeviceCommand`, `AuthenticateUserCommand`

**Queries** (Read Operations):
- Return data without side effects
- Can be optimized independently
- May use different data sources
- Examples: `ListDevicesQuery`, `GetDeviceMetricsQuery`

### 3. Multi-Tenancy Architecture

**Tenant Isolation**:
- Every entity is tenant-scoped via `customerId`
- `TenantContext` tracks current tenant and enforces isolation
- `TenantScopedEntity` base class for domain entities
- Repository queries automatically filter by tenant

**SUPERADMIN Capabilities**:
- Platform-wide management access
- Can bypass tenant restrictions
- Access to all customer data
- Special role with elevated permissions

### 4. Event-Driven Architecture

**Domain Events**:
- Published when domain state changes
- Enable loose coupling between bounded contexts
- Examples: `DeviceRegisteredEvent`, `UserAuthenticatedEvent`

**Event Processing**:
- Asynchronous event handlers
- Event sourcing for audit trails
- Integration events for cross-service communication

## Domain-Driven Design Implementation

### Core Building Blocks

#### Entities
```typescript
export class Device extends TenantScopedEntity {
  private constructor(
    id: DeviceId,
    private _deviceId: DeviceId,
    private _hostname: DeviceName,
    // ... other properties
  ) {
    super(id);
  }

  static create(params: DeviceCreationParams): Device {
    // Business logic validation
    const device = new Device(/* ... */);

    // Publish domain event
    device.addDomainEvent(new DeviceRegisteredEvent(device.id));

    return device;
  }

  updateHostname(newHostname: DeviceName): void {
    this._hostname = newHostname;
    this.addDomainEvent(new DeviceHostnameUpdatedEvent(this.id, newHostname));
  }
}
```

#### Value Objects
```typescript
export class IpAddress extends ValueObject {
  private constructor(private readonly _value: string) {
    super();
    this.validate();
  }

  static create(value: string): IpAddress {
    return new IpAddress(value);
  }

  private validate(): void {
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!ipRegex.test(this._value)) {
      throw new Error('Invalid IP address format');
    }
  }

  getValue(): string {
    return this._value;
  }
}
```

#### Domain Services
```typescript
export class DeviceRegistrationService {
  constructor(
    private deviceRepository: DeviceRepository,
    private networkScanner: NetworkScanner
  ) {}

  async registerDevice(deviceData: DeviceRegistrationData): Promise<Device> {
    // Complex business logic that doesn't belong in entities
    const existingDevice = await this.deviceRepository.findByIpAddress(deviceData.ipAddress);

    if (existingDevice) {
      throw new DeviceAlreadyExistsException(deviceData.ipAddress);
    }

    // Additional validation logic
    await this.validateDeviceConnectivity(deviceData);

    return Device.create(deviceData);
  }
}
```

### Repository Pattern

**Domain Interface**:
```typescript
export interface DeviceRepository {
  findById(id: DeviceId): Promise<Device | null>;
  findByIpAddress(ipAddress: IpAddress): Promise<Device | null>;
  save(device: Device): Promise<void>;
  exists(id: DeviceId): Promise<boolean>;
}
```

**Infrastructure Implementation**:
```typescript
export class PrismaDeviceRepository implements DeviceRepository {
  async findById(id: DeviceId): Promise<Device | null> {
    const deviceData = await this.prisma.device.findUnique({
      where: { id: id.getValue() }
    });

    return deviceData ? this.mapper.toDomain(deviceData) : null;
  }

  async save(device: Device): Promise<void> {
    const persistenceData = this.mapper.toPersistence(device);
    await this.prisma.device.upsert({
      where: { id: device.getId().getValue() },
      update: persistenceData,
      create: persistenceData
    });
  }
}
```

## Bounded Contexts

### Device Management Context

**Responsibilities**:
- Device registration and lifecycle management
- Device configuration and settings
- SSH connection management
- Device command execution
- Device metrics collection

**Entities**: Device, DeviceCommand, SshSession
**Value Objects**: DeviceId, DeviceName, IpAddress, SshCredentials, DeviceType
**Domain Events**: DeviceRegisteredEvent, DeviceConnectedEvent, DeviceCommandExecutedEvent

### User Management Context

**Responsibilities**:
- User authentication and authorization
- User profile management
- Role-based access control
- Session management
- Password policies

**Entities**: User, Session
**Value Objects**: UserId, Email, Username, Password, UserRole
**Domain Events**: UserRegisteredEvent, UserAuthenticatedEvent, PasswordChangedEvent

### Customer Management Context

**Responsibilities**:
- Multi-tenant customer management
- Subscription and billing
- Customer-specific configurations
- Resource quotas and limits

**Entities**: Customer
**Value Objects**: CustomerId, CustomerName, CustomerSlug, OrganizationSettings
**Domain Events**: CustomerCreatedEvent, SubscriptionChangedEvent

### Monitoring Context

**Responsibilities**:
- Device metrics collection and storage
- Alert threshold management
- Alert generation and notification
- Historical data analysis
- Performance monitoring

**Entities**: Metric, Alert, Threshold, MonitoringReport
**Value Objects**: MetricId, AlertId, MetricValue, TimeRange
**Domain Events**: AlertTriggeredEvent, ThresholdBreachedEvent, MetricCollectedEvent

## CQRS Architecture

### Command Processing

**Command Bus**:
```typescript
export class CommandBus {
  private handlers = new Map<string, CommandHandler>();

  async execute<T extends Command>(command: T): Promise<void> {
    const handler = this.handlers.get(command.constructor.name);

    if (!handler) {
      throw new Error(`No handler found for command ${command.constructor.name}`);
    }

    // Validate command
    await this.validateCommand(command);

    // Execute with tenant context
    await withTenant(command.tenantContext, async () => {
      await handler.handle(command);
    });
  }
}
```

**Command Handler Example**:
```typescript
export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand> {
  constructor(
    private deviceRepository: DeviceRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: RegisterDeviceCommand): Promise<void> {
    // Domain logic
    const device = Device.create({
      id: DeviceId.create(command.deviceId),
      deviceId: DeviceId.create(command.deviceId),
      hostname: DeviceName.create(command.hostname),
      ipAddress: IpAddress.create(command.ipAddress),
      customerId: command.tenantContext.getCustomerId()
    });

    // Persist
    await this.deviceRepository.save(device);

    // Publish events
    await this.eventBus.publish(device.getDomainEvents());
  }
}
```

### Query Processing

**Query Bus**:
```typescript
export class QueryBus {
  private handlers = new Map<string, QueryHandler>();

  async execute<T extends Query, R>(
    query: T
  ): Promise<R> {
    const handler = this.handlers.get(query.constructor.name);

    if (!handler) {
      throw new Error(`No handler found for query ${query.constructor.name}`);
    }

    // Execute with tenant context (read-only)
    return await withTenant(query.tenantContext, async () => {
      return await handler.handle(query);
    });
  }
}
```

**Query Handler Example**:
```typescript
export class ListDevicesHandler implements QueryHandler<ListDevicesQuery, DeviceDTO[]> {
  constructor(private deviceRepository: DeviceRepository) {}

  async handle(query: ListDevicesQuery): Promise<DeviceDTO[]> {
    const devices = await this.deviceRepository.findAll({
      skip: query.offset,
      take: query.limit,
      where: query.filters
    });

    return devices.map(device => this.mapper.toDTO(device));
  }
}
```

## Event-Driven Architecture

### Domain Events

**Event Definition**:
```typescript
export class DeviceRegisteredEvent implements DomainEvent {
  public readonly eventType = 'DeviceRegistered';
  public readonly aggregateId: string;
  public readonly occurredOn: Date;

  constructor(
    public readonly deviceId: DeviceId,
    public readonly customerId: CustomerId,
    public readonly deviceType: DeviceType
  ) {
    this.aggregateId = deviceId.getValue();
    this.occurredOn = new Date();
  }
}
```

### Event Bus

**Event Publishing**:
```typescript
export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventHandlers = this.handlers.get(event.eventType) || [];

      for (const handler of eventHandlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          // Log error but don't stop processing other handlers
          this.logger.error(`Event handler failed: ${error.message}`, error);
        }
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }
}
```

### Event Handlers

**Asynchronous Processing**:
```typescript
export class DeviceRegistrationEventHandler implements EventHandler<DeviceRegisteredEvent> {
  constructor(
    private monitoringService: MonitoringService,
    private notificationService: NotificationService
  ) {}

  async handle(event: DeviceRegisteredEvent): Promise<void> {
    // Set up monitoring for new device
    await this.monitoringService.initializeDeviceMonitoring(event.deviceId);

    // Send notification
    await this.notificationService.sendDeviceRegistrationNotification(
      event.customerId,
      event.deviceId
    );
  }
}
```

## Technology Stack

### Backend Runtime
- **Node.js 18+**: Server-side JavaScript runtime
- **TypeScript**: Static type checking and enhanced developer experience
- **Express.js**: Web framework (via Next.js API routes)

### Database Layer
- **PostgreSQL 15**: Primary relational database
- **Prisma ORM**: Type-safe database access and migrations
- **Redis 7**: Caching and session storage

### Real-time Communication
- **Socket.IO**: Real-time device communication
- **WebSocket**: Bidirectional communication channels

### Time-Series Data
- **InfluxDB 2.x**: Metrics and time-series data storage
- **Telegraf**: Metrics collection agent

### Message Queue (Future)
- **MQTT**: Lightweight messaging protocol for IoT devices
- **Redis Pub/Sub**: In-memory messaging for internal events

### Monitoring & Observability
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

### Infrastructure
- **Docker**: Containerization
- **Traefik**: Reverse proxy and load balancer
- **Tailscale**: VPN for device mesh networking

## Infrastructure & Deployment

### Container Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Traefik       │    │   IoT Pilot     │    │   PostgreSQL     │
│   (Reverse      │◄──►│   Server        │◄──►│   Database       │
│    Proxy)       │    │   (Next.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis         │    │   InfluxDB      │    │   Grafana        │
│   (Cache)       │    │   (Metrics)     │    │   (Dashboards)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Deployment Strategy

**Development**:
- Local Docker Compose setup
- Hot reload enabled
- Development databases
- Debug logging

**Staging**:
- Docker Compose with production-like settings
- Automated testing
- Performance monitoring
- Integration testing

**Production**:
- Docker Swarm or Kubernetes
- Load balancing
- High availability
- Comprehensive monitoring

### Environment Configuration

**Required Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-secret-key

# InfluxDB
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=your-token
INFLUXDB_ORG=iotpilot
INFLUXDB_BUCKET=devices

# External Services
SMTP_HOST=smtp.gmail.com
SMS_PROVIDER=twilio
```

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication**:
```typescript
// Access token for API calls
const accessToken = jwt.sign({
  userId: user.id,
  customerId: customer.id,
  role: user.role,
  type: 'access'
}, secret, { expiresIn: '15m' });

// Refresh token for token renewal
const refreshToken = jwt.sign({
  userId: user.id,
  type: 'refresh'
}, secret, { expiresIn: '7d' });
```

**Role-Based Access Control**:
- **SUPERADMIN**: Platform-wide access
- **CUSTOMER_ADMIN**: Customer-level administration
- **USER**: Standard user access
- **READONLY**: Read-only access

### Tenant Isolation

**Database-Level Isolation**:
```sql
-- All queries automatically filtered by customer_id
SELECT * FROM devices WHERE customer_id = $1;
```

**Application-Level Enforcement**:
```typescript
export class TenantContext {
  constructor(
    private customerId?: CustomerId,
    private userId: UserId,
    private role: UserRole,
    private isSuperAdmin: boolean = false
  ) {}

  canAccessTenant(targetCustomerId: CustomerId): boolean {
    return this.isSuperAdmin || this.customerId?.equals(targetCustomerId) === true;
  }
}
```

### Security Measures

- **Input Validation**: All inputs validated using value objects
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: Sanitized outputs and CSP headers
- **CSRF Protection**: CSRF tokens for state-changing operations
- **Rate Limiting**: Request rate limiting on authentication endpoints
- **Audit Logging**: Comprehensive audit trails for security events

## Monitoring & Observability

### Application Metrics

**Business Metrics**:
- Device registration rate
- Command execution success/failure
- User authentication attempts
- Alert generation rate

**Performance Metrics**:
- API response times
- Database query performance
- Memory and CPU usage
- Error rates by endpoint

### Infrastructure Monitoring

**System Metrics**:
- Server resource utilization
- Database connection pools
- Cache hit/miss ratios
- Network latency

**Service Health Checks**:
- Database connectivity
- External service availability
- Message queue status
- Background job processing

### Logging Strategy

**Structured Logging**:
```typescript
logger.info('Device registered', {
  deviceId: device.id,
  customerId: customer.id,
  userId: user.id,
  ipAddress: device.ipAddress,
  userAgent: request.userAgent,
  timestamp: new Date().toISOString()
});
```

**Log Levels**:
- **ERROR**: System errors requiring immediate attention
- **WARN**: Potential issues or unusual conditions
- **INFO**: Normal operational messages
- **DEBUG**: Detailed debugging information

### Alerting Rules

**Critical Alerts**:
- Application downtime
- Database connection failures
- Security breaches
- Data loss incidents

**Warning Alerts**:
- High error rates
- Performance degradation
- Resource utilization spikes
- Failed background jobs

This architecture provides a solid foundation for scalable, maintainable, and secure IoT device management while following domain-driven design principles and modern software architecture patterns.
