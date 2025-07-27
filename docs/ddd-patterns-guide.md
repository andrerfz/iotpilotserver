# Domain-Driven Design Patterns Guide

## Overview

This guide documents the Domain-Driven Design (DDD) patterns implemented in the IoT Pilot Server. It serves as a reference for developers working with the codebase and provides examples of how DDD principles are applied in practice.

## 🏗️ Core DDD Patterns

### 1. Layered Architecture Pattern

The system follows strict layered architecture with clear dependencies:

```
┌─────────────────────────────────────┐
│          Presentation Layer         │ ← React Components, API Routes
├─────────────────────────────────────┤
│         Application Layer           │ ← Commands, Queries, Services
├─────────────────────────────────────┤
│           Domain Layer              │ ← Entities, Value Objects, Domain Services
├─────────────────────────────────────┤
│       Infrastructure Layer          │ ← Repositories, External Services
└─────────────────────────────────────┘
```

**Dependency Rule**: Higher layers can depend on lower layers, but never vice versa.

### 2. Bounded Context Pattern

The system is divided into bounded contexts, each representing a cohesive domain area:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Device Mgmt   │  │   User Mgmt     │  │   Monitoring    │
│                 │  │                 │  │                 │
│ • Device        │  │ • User          │  │ • Alert         │
│ • Command       │  │ • Customer      │  │ • Threshold     │
│ • Metric        │  │ • Session       │  │ • Metric        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Context Mapping**: Contexts communicate through well-defined interfaces.

## 🏢 Domain Layer Patterns

### Entity Pattern

Entities represent domain concepts with identity and lifecycle:

```typescript
export class Device extends TenantScopedEntity {
  private constructor(
    id: DeviceId,
    private deviceId: string,
    private hostname: string,
    private ipAddress: IpAddress,
    private status: DeviceStatus,
    customerId: CustomerId
  ) {
    super(customerId);
  }

  // Factory method for creation
  static create(props: CreateDeviceProps, customerId: CustomerId): Device {
    // Validation and business rules
    return new Device(
      DeviceId.create(),
      props.deviceId,
      props.hostname,
      IpAddress.create(props.ipAddress),
      DeviceStatus.OFFLINE,
      customerId
    );
  }

  // Business methods
  connect(): void {
    if (this.status === DeviceStatus.ONLINE) {
      throw new DeviceAlreadyConnectedException(this.id);
    }
    this.status = DeviceStatus.ONLINE;
    this.addDomainEvent(new DeviceConnectedEvent(this.id, this.customerId));
  }
}
```

**Entity Patterns Applied:**
- Private constructors with factory methods
- Business logic encapsulation
- Domain event publishing
- Immutable identity

### Value Object Pattern

Value objects represent immutable concepts without identity:

```typescript
export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    if (!this.isValidEmail(value)) {
      throw new InvalidEmailException(value);
    }
    return new Email(value.toLowerCase().trim());
  }

  static fromString(value: string): Email {
    return this.create(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  private static isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
}
```

**Value Object Patterns:**
- Immutable by design
- Self-validating constructors
- Factory methods for creation
- Value-based equality

### Domain Service Pattern

Domain services contain business logic that doesn't belong to entities:

```typescript
export class DeviceConnectionService {
  constructor(
    private deviceRepository: DeviceRepository,
    private sshClient: SshClient
  ) {}

  async executeCommand(deviceId: DeviceId, command: string): Promise<CommandResult> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }

    if (!device.isOnline()) {
      throw new DeviceOfflineException(deviceId);
    }

    try {
      const result = await this.sshClient.executeCommand(
        device.getIpAddress(),
        command
      );

      device.recordCommandExecution(command, result.success);
      await this.deviceRepository.save(device);

      return result;
    } catch (error) {
      device.recordCommandFailure(command, error.message);
      await this.deviceRepository.save(device);
      throw error;
    }
  }
}
```

**Domain Service Patterns:**
- Stateless business logic
- Dependency injection
- Cross-entity coordination
- Side-effect management

### Domain Event Pattern

Domain events represent significant business occurrences:

```typescript
export class DeviceRegisteredEvent implements DomainEvent {
  public readonly eventVersion: number = 1;
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly deviceId: DeviceId,
    public readonly customerId: CustomerId,
    public readonly deviceData: DeviceRegistrationData
  ) {}

  eventType(): string {
    return 'DeviceRegisteredEvent';
  }

  aggregateId(): string {
    return this.deviceId.getValue();
  }
}
```

**Domain Event Patterns:**
- Past tense naming
- Immutable event data
- Aggregate identity
- Versioning support

## 🏛️ Application Layer Patterns

### Command Pattern

Commands represent write operations with business intent:

```typescript
export class RegisterDeviceCommand extends TenantAwareCommand {
  constructor(
    public readonly deviceId: string,
    public readonly name: string,
    public readonly ipAddress: string,
    public readonly username: string,
    public readonly password: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}

export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand> {
  constructor(
    private deviceRepository: DeviceRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: RegisterDeviceCommand): Promise<void> {
    // Input validation
    const deviceId = DeviceId.create();
    const ipAddress = IpAddress.create(command.ipAddress);

    // Business logic
    const existingDevice = await this.deviceRepository.findByDeviceId(command.deviceId);
    if (existingDevice) {
      throw new DeviceAlreadyExistsException(command.deviceId);
    }

    // Create and save
    const device = Device.register({
      deviceId: command.deviceId,
      name: command.name,
      ipAddress,
      username: command.username,
      password: command.password
    }, command.getCustomerId());

    await this.deviceRepository.save(device);

    // Publish events
    await this.eventBus.publish(device.getDomainEvents());
  }
}
```

**Command Patterns:**
- Intent-revealing naming
- Input validation
- Business rule enforcement
- Event publishing

### Query Pattern

Queries represent read operations optimized for performance:

```typescript
export class GetDeviceQuery extends TenantAwareQuery {
  constructor(
    public readonly deviceId: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}

export class GetDeviceHandler implements QueryHandler<GetDeviceQuery, DeviceDTO> {
  constructor(private deviceRepository: DeviceRepository) {}

  async handle(query: GetDeviceQuery): Promise<DeviceDTO> {
    const deviceId = DeviceId.create(query.deviceId);
    const device = await this.deviceRepository.findById(deviceId, query.getTenantContext());

    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }

    return DeviceMapper.toDTO(device);
  }
}
```

**Query Patterns:**
- Read-optimized data access
- DTO-based responses
- Tenant-aware filtering
- Exception handling

### Application Service Pattern

Application services orchestrate complex use cases:

```typescript
export class DeviceManagementService {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private eventBus: EventBus
  ) {}

  async registerAndConnectDevice(
    deviceData: DeviceRegistrationData,
    tenantContext: TenantContext
  ): Promise<DeviceDTO> {
    // Register device
    const registerCommand = new RegisterDeviceCommand(
      deviceData.deviceId,
      deviceData.name,
      deviceData.ipAddress,
      deviceData.username,
      deviceData.password,
      tenantContext
    );
    await this.commandBus.execute(registerCommand);

    // Connect device
    const connectCommand = new ConnectDeviceCommand(deviceData.deviceId, tenantContext);
    await this.commandBus.execute(connectCommand);

    // Return device data
    const query = new GetDeviceQuery(deviceData.deviceId, tenantContext);
    return await this.queryBus.execute(query);
  }
}
```

**Application Service Patterns:**
- Cross-aggregate coordination
- Transaction management
- Event orchestration
- Business workflow management

## 🏭 Infrastructure Layer Patterns

### Repository Pattern

Repositories provide data access abstraction:

```typescript
export interface DeviceRepository {
  findById(id: DeviceId, tenantContext?: TenantContext): Promise<Device | null>;
  findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<Device | null>;
  findByCustomerId(customerId: CustomerId, tenantContext?: TenantContext): Promise<Device[]>;
  save(device: Device, tenantContext?: TenantContext): Promise<void>;
  delete(id: DeviceId, tenantContext?: TenantContext): Promise<void>;
}

export class PrismaDeviceRepository implements DeviceRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<Device | null> {
    const deviceData = await this.prisma.device.findFirst({
      where: {
        id: id.getValue(),
        customerId: tenantContext?.customerId
      }
    });

    return deviceData ? DeviceMapper.toDomain(deviceData) : null;
  }
}
```

**Repository Patterns:**
- Interface segregation
- Tenant-aware queries
- Domain object mapping
- Transaction management

### Unit of Work Pattern

For complex operations requiring transaction consistency:

```typescript
export class DeviceUnitOfWork {
  constructor(private prisma: PrismaClient) {}

  async executeInTransaction<T>(
    callback: (repositories: DeviceRepositories) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const repositories = {
        device: new PrismaDeviceRepository(tx),
        command: new PrismaDeviceCommandRepository(tx),
        metric: new PrismaDeviceMetricRepository(tx)
      };

      return await callback(repositories);
    });
  }
}
```

**Unit of Work Patterns:**
- Transaction boundaries
- Repository coordination
- Consistency guarantees
- Rollback handling

## 🔄 CQRS Implementation Patterns

### Command Query Separation

```typescript
// Commands (Write Model)
export class UpdateDeviceStatusCommand extends TenantAwareCommand {
  constructor(
    public readonly deviceId: string,
    public readonly status: DeviceStatus,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}

// Queries (Read Model)
export class GetDeviceStatusQuery extends TenantAwareQuery {
  constructor(
    public readonly deviceId: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }
}
```

### Bus Pattern

```typescript
export interface CommandBus {
  execute<T extends Command, R = void>(command: T): Promise<R>;
}

export interface QueryBus {
  execute<T extends Query, R>(query: T): Promise<R>;
}

export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<T extends Command, R = void>(
    commandClass: new (...args: any[]) => T,
    handler: CommandHandler<T, R>
  ): void {
    this.handlers.set(commandClass.name, handler);
  }

  async execute<T extends Command, R = void>(command: T): Promise<R> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      throw new Error(`No handler found for ${command.constructor.name}`);
    }
    return await handler.handle(command);
  }
}
```

## 🏢 Multi-Tenancy Patterns

### Tenant Context Pattern

```typescript
export interface TenantContext {
  customerId: string | null;
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

export abstract class TenantAwareCommand extends Command {
  constructor(protected tenantContext: TenantContext) {
    super();
  }

  getCustomerId(): CustomerId | null {
    return this.tenantContext.customerId ? CustomerId.create(this.tenantContext.customerId) : null;
  }

  isSuperAdmin(): boolean {
    return this.tenantContext.isSuperAdmin;
  }
}
```

### Tenant-Aware Repository Pattern

```typescript
export class PrismaDeviceRepository implements DeviceRepository {
  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<Device | null> {
    const where: any = { id: id.getValue() };

    // Add tenant filtering unless SUPERADMIN
    if (tenantContext && !tenantContext.isSuperAdmin) {
      where.customerId = tenantContext.customerId;
    }

    const deviceData = await this.prisma.device.findUnique({ where });
    return deviceData ? DeviceMapper.toDomain(deviceData) : null;
  }
}
```

### Tenant Middleware Pattern

```typescript
export class TenantPrismaClient {
  private prisma: PrismaClient;

  get client() {
    return new Proxy(this.prisma, {
      get: (target, modelName) => {
        if (typeof modelName === 'string' && this.isTenantModel(modelName)) {
          return new Proxy(target[modelName], {
            get: (model, methodName) => {
              return (...args: any[]) => {
                const context = tenantContext.getStore();

                if (context?.isSuperAdmin) {
                  return model[methodName](...args);
                }

                // Apply tenant filtering
                return this.applyTenantFilter(model, methodName, args, context);
              };
            }
          });
        }
        return target[modelName];
      }
    });
  }
}
```

## 🎯 Best Practices

### 1. Entity Design
- Use private constructors with factory methods
- Encapsulate business logic within entities
- Publish domain events for significant state changes
- Keep entities focused on a single aggregate root

### 2. Value Object Usage
- Make value objects immutable
- Use them for validation and type safety
- Implement proper equality comparison
- Consider performance for large value objects

### 3. Service Layering
- Keep domain services stateless
- Use application services for orchestration
- Inject dependencies through constructors
- Handle cross-cutting concerns in infrastructure

### 4. CQRS Implementation
- Keep commands focused on single operations
- Optimize queries for read performance
- Use different models for read/write if needed
- Maintain eventual consistency between models

### 5. Repository Patterns
- Define interfaces in domain layer
- Implement in infrastructure layer
- Use tenant-aware queries consistently
- Handle optimistic concurrency if needed

### 6. Error Handling
- Use domain-specific exceptions
- Don't leak infrastructure details
- Log errors with appropriate context
- Provide meaningful error messages

## 🧪 Testing Patterns

### Domain Logic Testing

```typescript
describe('Device Entity', () => {
  it('should connect when offline', () => {
    const device = Device.create(deviceData, customerId);
    expect(device.getStatus()).toBe(DeviceStatus.OFFLINE);

    device.connect();
    expect(device.getStatus()).toBe(DeviceStatus.ONLINE);
  });

  it('should throw when connecting while online', () => {
    const device = Device.create(deviceData, customerId);
    device.connect();

    expect(() => device.connect()).toThrow(DeviceAlreadyConnectedException);
  });
});
```

### Application Service Testing

```typescript
describe('DeviceManagementService', () => {
  it('should register and connect device', async () => {
    const commandBus = mock<CommandBus>();
    const queryBus = mock<QueryBus>();
    const service = new DeviceManagementService(commandBus, queryBus);

    await service.registerAndConnectDevice(deviceData, tenantContext);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RegisterDeviceCommand));
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(ConnectDeviceCommand));
  });
});
```

### Repository Testing

```typescript
describe('PrismaDeviceRepository', () => {
  it('should find device by ID with tenant filtering', async () => {
    const device = await repository.findById(deviceId, tenantContext);
    expect(device).toBeDefined();
    expect(device?.getCustomerId()).toEqual(tenantContext.customerId);
  });
});
```

## 📚 Common Anti-Patterns to Avoid

### 1. Anemic Domain Model
```typescript
// ❌ Bad: Entity with no behavior
class Device {
  constructor(public id: string, public status: string) {}
  updateStatus(status: string) {
    this.status = status; // Business logic in application layer
  }
}
```

### 2. Repository Interface in Infrastructure
```typescript
// ❌ Bad: Interface defined in infrastructure
export class PrismaDeviceRepository implements DeviceRepository {
  interface DeviceRepository {
    findById(id: string): Promise<Device>;
  }
}
```

### 3. Business Logic in Application Services
```typescript
// ❌ Bad: Business rules in application layer
export class DeviceService {
  async updateDevice(deviceId: string, status: string) {
    const device = await this.repository.findById(deviceId);
    if (status === 'online' && device.status === 'online') {
      throw new Error('Device already online'); // Domain logic here
    }
    // ...
  }
}
```

### 4. Tight Coupling
```typescript
// ❌ Bad: Direct infrastructure dependency
export class DeviceService {
  constructor(private repository: PrismaDeviceRepository) {} // Concrete class
}
```

## 🔗 Resources

- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Clean Architecture** by Robert C. Martin
- **Patterns of Enterprise Application Architecture** by Martin Fowler

## 📝 Implementation Checklist

- [x] Entities with business logic and validation
- [x] Value objects for immutable concepts
- [x] Domain services for cross-entity logic
- [x] Repository interfaces in domain layer
- [x] CQRS with separate commands and queries
- [x] Application services for orchestration
- [x] Domain events for decoupling
- [x] Multi-tenant support with context
- [x] Comprehensive testing coverage
- [x] Clear separation of concerns
- [x] Dependency injection throughout
- [x] Proper error handling and logging

---

This guide provides the foundation for understanding and extending the DDD implementation in IoT Pilot Server. Following these patterns ensures maintainable, testable, and scalable domain logic.
