# CQRS Implementation Guide

## Overview

IoT Pilot Server implements the **Command Query Responsibility Segregation (CQRS)** pattern to optimize read and write operations. This document details the CQRS implementation, patterns used, and practical examples from the codebase.

## CQRS Fundamentals

### Core Principles

**Commands** (Write Operations):
- Represent user intentions to change system state
- Are validated and authorized before execution
- Mutate domain entities and trigger side effects
- Follow imperative naming: `RegisterDevice`, `UpdateUser`, `AcknowledgeAlert`

**Queries** (Read Operations):
- Return data without modifying state
- Can be optimized independently of write models
- May use different data sources or caching strategies
- Follow declarative naming: `GetDevice`, `ListUsers`, `GetDeviceMetrics`

### Benefits in IoT Pilot

1. **Scalability**: Independent scaling of read and write workloads
2. **Performance**: Optimized data models for specific use cases
3. **Maintainability**: Clear separation of concerns
4. **Flexibility**: Different storage technologies for different needs

## Architecture Components

### Command Side

#### Command DTOs

Commands are immutable data transfer objects that represent write operations:

```typescript
// packages/core/src/device/application/commands/register-device.command.ts
export class RegisterDeviceCommand implements Command {
  private constructor(
    public readonly deviceId: string,
    public readonly hostname: string,
    public readonly ipAddress: string,
    public readonly customerId: string,
    public readonly userId: string
  ) {}

  static create(params: {
    deviceId: string;
    hostname: string;
    ipAddress: string;
    customerId: string;
    userId: string;
  }): RegisterDeviceCommand {
    // Validation logic
    if (!params.deviceId?.trim()) {
      throw new Error('Device ID is required');
    }

    return new RegisterDeviceCommand(
      params.deviceId.trim(),
      params.hostname.trim(),
      params.ipAddress.trim(),
      params.customerId.trim(),
      params.userId.trim()
    );
  }

  getCommandName(): string {
    return 'RegisterDeviceCommand';
  }
}
```

#### Command Handlers

Handlers contain the business logic for executing commands:

```typescript
// packages/core/src/device/application/commands/register-device.handler.ts
export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand> {
  constructor(
    private deviceRepository: DeviceRepository,
    private deviceRegistrationService: DeviceRegistrationService,
    private eventBus: EventBus
  ) {}

  async handle(command: RegisterDeviceCommand): Promise<void> {
    // Domain logic execution
    const device = await this.deviceRegistrationService.registerDevice({
      deviceId: DeviceId.create(command.deviceId),
      hostname: DeviceName.create(command.hostname),
      ipAddress: IpAddress.create(command.ipAddress),
      customerId: CustomerId.create(command.customerId),
      userId: UserId.create(command.userId)
    });

    // Persistence
    await this.deviceRepository.save(device);

    // Event publishing
    await this.eventBus.publish(device.getDomainEvents());
  }
}
```

#### Command Bus

Routes commands to appropriate handlers:

```typescript
// packages/core/src/shared/application/bus/command-bus.ts
export class CommandBus {
  private handlers = new Map<string, CommandHandler>();

  register<T extends Command>(commandType: new (...args: any[]) => T, handler: CommandHandler<T>): void {
    this.handlers.set(commandType.name, handler);
  }

  async execute<T extends Command>(command: T): Promise<void> {
    const handler = this.handlers.get(command.constructor.name);

    if (!handler) {
      throw new Error(`No handler found for command ${command.constructor.name}`);
    }

    // Execute within tenant context
    await withTenant(command.tenantContext, async () => {
      await handler.handle(command);
    });
  }
}
```

### Query Side

#### Query DTOs

Queries define read operations and parameters:

```typescript
// packages/core/src/device/application/queries/list-devices.query.ts
export class ListDevicesQuery implements Query {
  private constructor(
    public readonly offset: number = 0,
    public readonly limit: number = 10,
    public readonly filters?: {
      status?: string;
      deviceType?: string;
      hostname?: string;
    }
  ) {}

  static create(params: {
    offset?: number;
    limit?: number;
    filters?: any;
  } = {}): ListDevicesQuery {
    const { offset = 0, limit = 10, filters } = params;

    if (offset < 0) throw new Error('Offset must be non-negative');
    if (limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100');

    return new ListDevicesQuery(offset, limit, filters);
  }

  getQueryName(): string {
    return 'ListDevicesQuery';
  }
}
```

#### Query Handlers

Handlers execute read operations and return DTOs:

```typescript
// packages/core/src/device/application/queries/list-devices.handler.ts
export class ListDevicesHandler implements QueryHandler<ListDevicesQuery, DeviceDTO[]> {
  constructor(
    private deviceRepository: DeviceRepository,
    private deviceMapper: DeviceMapper
  ) {}

  async handle(query: ListDevicesQuery): Promise<DeviceDTO[]> {
    // Execute query (potentially from cache or optimized read model)
    const devices = await this.deviceRepository.findAll({
      skip: query.offset,
      take: query.limit,
      where: this.buildWhereClause(query.filters)
    });

    // Map to DTOs
    return devices.map(device => this.deviceMapper.toDTO(device));
  }

  private buildWhereClause(filters?: any) {
    // Build optimized query conditions
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.deviceType) {
      where.deviceType = filters.deviceType;
    }

    if (filters?.hostname) {
      where.hostname = { contains: filters.hostname, mode: 'insensitive' };
    }

    return where;
  }
}
```

#### Query Bus

Routes queries to handlers:

```typescript
// packages/core/src/shared/application/bus/query-bus.ts
export class QueryBus {
  private handlers = new Map<string, QueryHandler>();

  register<T extends Query, R>(
    queryType: new (...args: any[]) => T,
    handler: QueryHandler<T, R>
  ): void {
    this.handlers.set(queryType.name, handler);
  }

  async execute<T extends Query, R>(query: T): Promise<R> {
    const handler = this.handlers.get(query.constructor.name);

    if (!handler) {
      throw new Error(`No handler found for query ${query.constructor.name}`);
    }

    // Execute within tenant context (read-only)
    return await withTenant(query.tenantContext, async () => {
      return await handler.handle(query) as R;
    });
  }
}
```

## Data Storage Strategies

### Write Model (PostgreSQL)

**Characteristics**:
- Normalized schema optimized for writes
- ACID transactions
- Domain integrity constraints
- Audit trails with full entity state

```sql
-- Device write model
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  device_id VARCHAR UNIQUE NOT NULL,
  hostname VARCHAR NOT NULL,
  ip_address INET NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  device_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  username VARCHAR,
  password VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX idx_devices_customer ON devices(customer_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_type ON devices(device_type);
```

### Read Model (Redis Cache)

**Characteristics**:
- Denormalized data for fast reads
- Session storage and temporary data
- Cache invalidation strategies
- Optimized for query patterns

```typescript
// Cached device summary
const deviceCacheKey = `devices:customer:${customerId}`;
const cachedDevices = await redis.get(deviceCacheKey);

if (!cachedDevices) {
  // Fetch from database and cache
  const devices = await deviceRepository.findAll({ customerId });
  const summaries = devices.map(d => ({
    id: d.getId().getValue(),
    hostname: d.getHostname().getValue(),
    status: d.getStatus().getValue(),
    lastSeen: d.getLastSeen()?.toISOString()
  }));

  await redis.setex(deviceCacheKey, 300, JSON.stringify(summaries)); // 5 min TTL
  return summaries;
}

return JSON.parse(cachedDevices);
```

### Time-Series Data (InfluxDB)

**Characteristics**:
- Optimized for time-series queries
- Metric data with retention policies
- Aggregation and downsampling
- Historical analysis

```sql
-- Device metrics storage
CREATE MEASUREMENT device_metrics
WITH FIELDS
  cpu_usage FLOAT,
  memory_usage FLOAT,
  disk_usage FLOAT,
  network_rx BIGINT,
  network_tx BIGINT
WITH TAGS
  device_id STRING,
  customer_id STRING
```

## Event-Driven Communication

### Domain Events

Events are published by aggregates and handled asynchronously:

```typescript
// Domain event definition
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

// Event publishing in aggregate
export class Device extends TenantScopedEntity {
  static create(params: DeviceCreationParams): Device {
    const device = new Device(/* ... */);

    // Publish domain event
    device.addDomainEvent(new DeviceRegisteredEvent(
      device.id,
      params.customerId,
      params.deviceType
    ));

    return device;
  }
}
```

### Event Handlers

Asynchronous processing of domain events:

```typescript
// Event handler for monitoring initialization
export class DeviceRegisteredEventHandler implements EventHandler<DeviceRegisteredEvent> {
  constructor(private monitoringService: MonitoringService) {}

  async handle(event: DeviceRegisteredEvent): Promise<void> {
    // Initialize monitoring for new device
    await this.monitoringService.initializeDeviceMonitoring(event.deviceId);

    // Set up alerting thresholds
    await this.monitoringService.createDefaultThresholds(event.deviceId, event.deviceType);
  }
}
```

## Practical Implementation Patterns

### 1. Command Validation

Commands are validated before execution:

```typescript
export class RegisterDeviceCommand implements Command {
  static create(params: any): RegisterDeviceCommand {
    // Business rule validation
    if (!params.deviceId?.match(/^[a-zA-Z0-9-_]+$/)) {
      throw new Error('Device ID must contain only letters, numbers, hyphens, and underscores');
    }

    // Authorization check
    if (!params.customerId) {
      throw new Error('Customer ID is required');
    }

    return new RegisterDeviceCommand(/* ... */);
  }
}
```

### 2. Query Optimization

Queries can be optimized independently:

```typescript
export class ListDevicesHandler implements QueryHandler<ListDevicesQuery, DeviceDTO[]> {
  constructor(
    private deviceRepository: DeviceRepository,
    private cacheService: CacheService
  ) {}

  async handle(query: ListDevicesQuery): Promise<DeviceDTO[]> {
    // Try cache first for common queries
    if (this.isCacheable(query)) {
      const cached = await this.cacheService.getDevices(query);
      if (cached) return cached;
    }

    // Execute optimized database query
    const devices = await this.deviceRepository.findOptimized(query);

    // Cache result
    if (this.isCacheable(query)) {
      await this.cacheService.setDevices(query, devices, 300); // 5 min TTL
    }

    return devices;
  }

  private isCacheable(query: ListDevicesQuery): boolean {
    // Only cache simple queries without complex filters
    return !query.filters?.hostname && query.limit <= 50;
  }
}
```

### 3. Eventual Consistency

Handle eventual consistency between write and read models:

```typescript
export class DeviceUpdatedEventHandler implements EventHandler<DeviceUpdatedEvent> {
  constructor(private cacheService: CacheService) {}

  async handle(event: DeviceUpdatedEvent): Promise<void> {
    // Invalidate related cache entries
    await this.cacheService.invalidateDevice(event.deviceId);
    await this.cacheService.invalidateCustomerDevices(event.customerId);

    // Update read models if needed
    await this.readModelService.updateDeviceSummary(event.deviceId);
  }
}
```

## Testing CQRS Components

### Command Handler Testing

```typescript
describe('RegisterDeviceHandler', () => {
  let handler: RegisterDeviceHandler;
  let mockRepository: jest.Mocked<DeviceRepository>;
  let mockService: jest.Mocked<DeviceRegistrationService>;

  beforeEach(() => {
    mockRepository = createMock(DeviceRepository);
    mockService = createMock(DeviceRegistrationService);
    handler = new RegisterDeviceHandler(mockRepository, mockService, mockEventBus);
  });

  it('should register device successfully', async () => {
    const command = RegisterDeviceCommand.create({
      deviceId: 'test-device',
      hostname: 'Test Device',
      ipAddress: '192.168.1.100',
      customerId: 'customer-1',
      userId: 'user-1'
    });

    const device = Device.create(/* ... */);
    mockService.registerDevice.mockResolvedValue(device);
    mockRepository.save.mockResolvedValue();

    await handler.handle(command);

    expect(mockService.registerDevice).toHaveBeenCalledWith(/* expected params */);
    expect(mockRepository.save).toHaveBeenCalledWith(device);
  });
});
```

### Query Handler Testing

```typescript
describe('ListDevicesHandler', () => {
  let handler: ListDevicesHandler;
  let mockRepository: jest.Mocked<DeviceRepository>;

  beforeEach(() => {
    mockRepository = createMock(DeviceRepository);
    handler = new ListDevicesHandler(mockRepository, mockMapper);
  });

  it('should return device list', async () => {
    const query = ListDevicesQuery.create({ limit: 10, offset: 0 });
    const devices = [createMockDevice()];
    const dtos = [createMockDeviceDTO()];

    mockRepository.findAll.mockResolvedValue(devices);
    mockMapper.toDTO.mockReturnValue(dtos[0]);

    const result = await handler.handle(query);

    expect(result).toEqual(dtos);
    expect(mockRepository.findAll).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: {}
    });
  });
});
```

## Performance Considerations

### Command Side Optimization
- **Fast validation**: Lightweight input validation
- **Efficient persistence**: Batch operations where possible
- **Minimal locking**: Optimistic concurrency control
- **Event buffering**: Batch event publishing

### Query Side Optimization
- **Caching strategies**: Multi-level caching (memory, Redis, CDN)
- **Read models**: Denormalized data for complex queries
- **Pagination**: Efficient large dataset handling
- **Indexing**: Database indexes for common query patterns

### Monitoring CQRS Performance
```typescript
// Metrics collection
const commandMetrics = {
  executionTime: Date.now() - startTime,
  commandType: command.constructor.name,
  success: true,
  tenantId: command.tenantContext.getCustomerId()?.getValue()
};

await metricsCollector.record('command.execution', commandMetrics);
```

## Migration and Evolution

### Adding New Commands

1. Create command DTO in appropriate bounded context
2. Implement command handler with business logic
3. Register handler with command bus
4. Add API endpoint if needed
5. Update tests and documentation

### Modifying Existing Commands

1. Ensure backward compatibility
2. Update command validation
3. Modify handler logic
4. Update API contracts
5. Migrate existing data if needed

### Query Evolution

1. Add new query types without affecting existing ones
2. Optimize read models independently
3. Update caching strategies as needed
4. Version query results for API stability

This CQRS implementation provides a solid foundation for scalable, maintainable, and performant IoT device management while maintaining clear boundaries between read and write concerns.
