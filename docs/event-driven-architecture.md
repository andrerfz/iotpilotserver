# Event-Driven Architecture

## Overview

IoT Pilot Server implements a comprehensive **event-driven architecture** that enables loose coupling between bounded contexts, supports eventual consistency, and provides audit trails for all business operations. This document details the event system implementation, patterns used, and practical examples.

## Core Concepts

### Domain Events

Domain events represent significant business occurrences within bounded contexts. They are immutable facts that have happened in the past.

```typescript
// packages/core/src/shared/domain/events/domain-event.base.ts
export interface DomainEvent {
  readonly eventType: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly eventVersion?: number;
}
```

### Event Publishing

Aggregates publish events when their state changes:

```typescript
// packages/core/src/device/domain/entities/device.entity.ts
export class Device extends TenantScopedEntity {
  static create(params: DeviceCreationParams): Device {
    const device = new Device(
      DeviceId.create(params.deviceId),
      params.hostname,
      params.ipAddress,
      params.sshCredentials,
      params.deviceType,
      DeviceStatus.create('OFFLINE'),
      params.customerId,
      params.userId
    );

    // Publish domain event
    device.addDomainEvent(new DeviceRegisteredEvent(
      device.id,
      params.customerId,
      params.deviceType
    ));

    return device;
  }

  connect(): void {
    this._status = DeviceStatus.create('ONLINE');
    this._lastSeen = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent(new DeviceConnectedEvent(
      this.id,
      this._ipAddress
    ));
  }
}
```

### Event Handling

Event handlers process events asynchronously and perform side effects:

```typescript
// packages/core/src/monitoring/application/handlers/device-registered.handler.ts
export class DeviceRegisteredEventHandler implements EventHandler<DeviceRegisteredEvent> {
  constructor(
    private monitoringService: MonitoringService,
    private alertService: AlertService
  ) {}

  async handle(event: DeviceRegisteredEvent): Promise<void> {
    // Initialize monitoring for the new device
    await this.monitoringService.initializeDeviceMonitoring(event.deviceId);

    // Create default alert thresholds
    await this.alertService.createDefaultThresholds(event.deviceId, event.deviceType);

    // Log the event for auditing
    logger.info('Device monitoring initialized', {
      deviceId: event.deviceId.getValue(),
      customerId: event.customerId.getValue(),
      deviceType: event.deviceType.getValue()
    });
  }
}
```

## Event System Architecture

### Event Bus

The event bus is the central component for event routing and delivery:

```typescript
// packages/core/src/shared/application/bus/event-bus.ts
export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private middlewares: EventMiddleware[] = [];

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      // Apply middlewares
      let processedEvent = event;
      for (const middleware of this.middlewares) {
        processedEvent = await middleware.process(processedEvent);
      }

      // Route to handlers
      const eventHandlers = this.handlers.get(event.eventType) || [];

      for (const handler of eventHandlers) {
        try {
          await handler.handle(processedEvent);
        } catch (error) {
          logger.error(`Event handler failed: ${error.message}`, {
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            error: error.message
          });
          // Continue processing other handlers
        }
      }
    }
  }

  use(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
  }
}
```

### Event Middleware

Middlewares provide cross-cutting concerns for event processing:

```typescript
// Logging middleware
export class LoggingMiddleware implements EventMiddleware {
  async process(event: DomainEvent): Promise<DomainEvent> {
    logger.info(`Event published: ${event.eventType}`, {
      aggregateId: event.aggregateId,
      occurredOn: event.occurredOn.toISOString()
    });
    return event;
  }
}

// Validation middleware
export class ValidationMiddleware implements EventMiddleware {
  async process(event: DomainEvent): Promise<DomainEvent> {
    if (!event.eventType || !event.aggregateId) {
      throw new Error('Invalid event structure');
    }
    return event;
  }
}
```

## Event Types and Categories

### Domain Events by Bounded Context

#### Device Context Events

```typescript
export class DeviceRegisteredEvent implements DomainEvent {
  readonly eventType = 'DeviceRegistered';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly deviceId: DeviceId,
    public readonly customerId: CustomerId,
    public readonly deviceType: DeviceType
  ) {
    this.aggregateId = deviceId.getValue();
    this.occurredOn = new Date();
  }
}

export class DeviceConnectedEvent implements DomainEvent {
  readonly eventType = 'DeviceConnected';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly deviceId: DeviceId,
    public readonly ipAddress: IpAddress
  ) {
    this.aggregateId = deviceId.getValue();
    this.occurredOn = new Date();
  }
}

export class DeviceCommandExecutedEvent implements DomainEvent {
  readonly eventType = 'DeviceCommandExecuted';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly deviceId: DeviceId,
    public readonly commandId: DeviceCommandId,
    public readonly success: boolean,
    public readonly executionTime: number
  ) {
    this.aggregateId = deviceId.getValue();
    this.occurredOn = new Date();
  }
}
```

#### User Context Events

```typescript
export class UserRegisteredEvent implements DomainEvent {
  readonly eventType = 'UserRegistered';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    public readonly role: UserRole
  ) {
    this.aggregateId = userId.getValue();
    this.occurredOn = new Date();
  }
}

export class UserAuthenticatedEvent implements DomainEvent {
  readonly eventType = 'UserAuthenticated';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly userId: UserId,
    public readonly ipAddress: string,
    public readonly userAgent: string
  ) {
    this.aggregateId = userId.getValue();
    this.occurredOn = new Date();
  }
}
```

#### Monitoring Context Events

```typescript
export class AlertTriggeredEvent implements DomainEvent {
  readonly eventType = 'AlertTriggered';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly alertId: AlertId,
    public readonly deviceId: DeviceId,
    public readonly thresholdId: ThresholdId,
    public readonly metricValue: MetricValue,
    public readonly severity: AlertSeverity
  ) {
    this.aggregateId = alertId.getValue();
    this.occurredOn = new Date();
  }
}

export class MetricCollectedEvent implements DomainEvent {
  readonly eventType = 'MetricCollected';
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly metricId: MetricId,
    public readonly deviceId: DeviceId,
    public readonly metricType: string,
    public readonly value: MetricValue
  ) {
    this.aggregateId = metricId.getValue();
    this.occurredOn = new Date();
  }
}
```

## Event Processing Patterns

### Synchronous Event Processing

Some events require immediate processing within the same transaction:

```typescript
// In command handler
export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand> {
  async handle(command: RegisterDeviceCommand): Promise<void> {
    // Create device
    const device = Device.create(command);

    // Synchronous validation (within same transaction)
    await this.validateDeviceUniqueness(device);

    // Persist device
    await this.deviceRepository.save(device);

    // Publish events (after successful persistence)
    await this.eventBus.publish(device.getDomainEvents());

    // Clear events from aggregate
    device.clearEvents();
  }
}
```

### Asynchronous Event Processing

Most events are processed asynchronously to avoid blocking the main flow:

```typescript
// Event handler registration
const eventBus = new EventBus();

// Register async handlers
eventBus.subscribe('DeviceRegistered', new DeviceMonitoringInitializer());
eventBus.subscribe('DeviceRegistered', new DeviceAlertSetupHandler());
eventBus.subscribe('UserAuthenticated', new LoginAuditLogger());
eventBus.subscribe('AlertTriggered', new AlertNotifier());

// Publish events asynchronously
await eventBus.publish(events);
```

### Eventual Consistency

Handle scenarios where read models lag behind write models:

```typescript
export class DeviceUpdatedEventHandler implements EventHandler<DeviceUpdatedEvent> {
  constructor(
    private cacheService: CacheService,
    private readModelService: ReadModelService
  ) {}

  async handle(event: DeviceUpdatedEvent): Promise<void> {
    // Invalidate cache immediately
    await this.cacheService.invalidateDevice(event.deviceId);

    // Update read models asynchronously
    await this.readModelService.updateDeviceReadModel(event.deviceId);

    // Notify subscribers (WebSocket, etc.)
    await this.notificationService.notifyDeviceUpdate(event.deviceId);
  }
}
```

## Event Storage and Persistence

### Event Sourcing (Optional)

For audit-critical operations, events can be stored for complete audit trails:

```typescript
export class EventStore {
  async save(events: DomainEvent[]): Promise<void> {
    const eventDocuments = events.map(event => ({
      id: crypto.randomUUID(),
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      data: JSON.stringify(event),
      occurredOn: event.occurredOn,
      eventVersion: event.eventVersion || 1
    }));

    await this.collection.insertMany(eventDocuments);
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const documents = await this.collection
      .find({ aggregateId })
      .sort({ occurredOn: 1 })
      .toArray();

    return documents.map(doc => JSON.parse(doc.data));
  }
}
```

### Event Replay

Rebuild aggregate state from event history:

```typescript
export class Device extends TenantScopedEntity {
  static fromEvents(events: DomainEvent[]): Device {
    if (events.length === 0) {
      throw new Error('Cannot create device from empty event stream');
    }

    let device: Device | null = null;

    for (const event of events) {
      switch (event.eventType) {
        case 'DeviceRegistered':
          device = new Device(
            event.deviceId,
            event.hostname,
            event.ipAddress,
            event.sshCredentials,
            event.deviceType,
            DeviceStatus.create('OFFLINE')
          );
          break;

        case 'DeviceConnected':
          if (device) {
            device.connect();
          }
          break;

        // Handle other events...
      }
    }

    return device!;
  }
}
```

## Integration Events

### Cross-Bounded Context Communication

```typescript
// Integration event for cross-service communication
export class DeviceStatusChangedIntegrationEvent implements IntegrationEvent {
  readonly eventType = 'DeviceStatusChanged';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly deviceId: string,
    public readonly customerId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly changedBy: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

// Publish to external systems
export class IntegrationEventPublisher {
  constructor(private messageQueue: MessageQueue) {}

  async publish(event: IntegrationEvent): Promise<void> {
    await this.messageQueue.publish('integration-events', {
      eventType: event.eventType,
      eventId: event.eventId,
      data: event,
      occurredOn: event.occurredOn.toISOString()
    });
  }
}
```

## Event Monitoring and Observability

### Event Metrics Collection

```typescript
export class EventMetricsCollector implements EventMiddleware {
  private metrics = new Map<string, number>();

  async process(event: DomainEvent): Promise<DomainEvent> {
    // Count events by type
    const count = this.metrics.get(event.eventType) || 0;
    this.metrics.set(event.eventType, count + 1);

    // Record event processing time
    const startTime = Date.now();

    // Process event...

    const processingTime = Date.now() - startTime;
    await this.metricsService.record('event.processing_time', {
      eventType: event.eventType,
      duration: processingTime
    });

    return event;
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
```

### Event Error Handling

```typescript
export class EventErrorHandler implements EventMiddleware {
  private retryCounts = new Map<string, number>();

  async process(event: DomainEvent): Promise<DomainEvent> {
    const eventKey = `${event.eventType}:${event.aggregateId}`;

    try {
      // Process event...
      this.retryCounts.delete(eventKey);
      return event;
    } catch (error) {
      const retryCount = (this.retryCounts.get(eventKey) || 0) + 1;
      this.retryCounts.set(eventKey, retryCount);

      if (retryCount <= 3) {
        logger.warn(`Event processing failed, retrying (${retryCount}/3)`, {
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          error: error.message
        });

        // Schedule retry
        await this.scheduleRetry(event, retryCount * 1000);
      } else {
        logger.error(`Event processing failed permanently`, {
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          error: error.message
        });

        // Move to dead letter queue
        await this.moveToDeadLetterQueue(event, error);
      }

      throw error;
    }
  }
}
```

## Testing Event-Driven Systems

### Event Handler Testing

```typescript
describe('DeviceRegisteredEventHandler', () => {
  let handler: DeviceRegisteredEventHandler;
  let mockMonitoringService: jest.Mocked<MonitoringService>;
  let mockAlertService: jest.Mocked<AlertService>;

  beforeEach(() => {
    mockMonitoringService = createMock(MonitoringService);
    mockAlertService = createMock(AlertService);
    handler = new DeviceRegisteredEventHandler(mockMonitoringService, mockAlertService);
  });

  it('should initialize monitoring for new device', async () => {
    const event = new DeviceRegisteredEvent(
      DeviceId.create('device-1'),
      CustomerId.create('customer-1'),
      DeviceType.create('PI_4')
    );

    mockMonitoringService.initializeDeviceMonitoring.mockResolvedValue();
    mockAlertService.createDefaultThresholds.mockResolvedValue();

    await handler.handle(event);

    expect(mockMonitoringService.initializeDeviceMonitoring)
      .toHaveBeenCalledWith(event.deviceId);
    expect(mockAlertService.createDefaultThresholds)
      .toHaveBeenCalledWith(event.deviceId, event.deviceType);
  });
});
```

### Event Publishing Testing

```typescript
describe('Device', () => {
  it('should publish DeviceRegisteredEvent when created', () => {
    const device = Device.create({
      deviceId: DeviceId.create('test-device'),
      hostname: DeviceName.create('Test Device'),
      ipAddress: IpAddress.create('192.168.1.100'),
      customerId: CustomerId.create('customer-1'),
      userId: UserId.create('user-1')
    });

    const events = device.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(DeviceRegisteredEvent);
    expect((events[0] as DeviceRegisteredEvent).deviceId).toEqual(device.id);
  });
});
```

### Event Bus Integration Testing

```typescript
describe('EventBus Integration', () => {
  let eventBus: EventBus;
  let mockHandler: jest.Mocked<EventHandler>;

  beforeEach(() => {
    eventBus = new EventBus();
    mockHandler = createMock(EventHandler);
    eventBus.subscribe('TestEvent', mockHandler);
  });

  it('should route events to correct handlers', async () => {
    const event = { eventType: 'TestEvent', aggregateId: 'test-1', occurredOn: new Date() };

    mockHandler.handle.mockResolvedValue();

    await eventBus.publish([event]);

    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });
});
```

## Event-Driven Best Practices

### Event Naming Conventions

- Use past tense: `DeviceRegistered`, not `RegisterDevice`
- Include aggregate type: `DeviceConnected`, not `Connected`
- Be specific: `DeviceCommandExecuted`, not `CommandCompleted`

### Event Versioning

```typescript
export class DeviceRegisteredEventV2 implements DomainEvent {
  readonly eventType = 'DeviceRegistered';
  readonly eventVersion = 2; // Version for schema evolution
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly deviceId: DeviceId,
    public readonly customerId: CustomerId,
    public readonly deviceType: DeviceType,
    public readonly ipAddress: IpAddress // New field in v2
  ) {
    this.aggregateId = deviceId.getValue();
    this.occurredOn = new Date();
  }
}
```

### Event Handler Idempotency

```typescript
export class IdempotentEventHandler implements EventHandler<DomainEvent> {
  private processedEvents = new Set<string>();

  async handle(event: DomainEvent): Promise<void> {
    const eventKey = `${event.eventType}:${event.aggregateId}:${event.occurredOn.getTime()}`;

    if (this.processedEvents.has(eventKey)) {
      logger.debug('Event already processed, skipping', { eventKey });
      return;
    }

    // Process event...
    await this.processEvent(event);

    // Mark as processed
    this.processedEvents.add(eventKey);
  }
}
```

### Event Ordering and Causality

```typescript
// Ensure event ordering for related operations
export class OrderedEventProcessor {
  private eventQueue = new Map<string, DomainEvent[]>();

  async process(event: DomainEvent): Promise<void> {
    const aggregateId = event.aggregateId;
    const queue = this.eventQueue.get(aggregateId) || [];

    // Add event to queue
    queue.push(event);
    this.eventQueue.set(aggregateId, queue);

    // Sort by occurrence time
    queue.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());

    // Process events in order
    while (queue.length > 0) {
      const nextEvent = queue.shift()!;
      await this.processSingleEvent(nextEvent);
    }
  }
}
```

## Performance Considerations

### Event Batching

```typescript
export class EventBatchProcessor {
  private eventBuffer: DomainEvent[] = [];
  private readonly batchSize = 100;
  private readonly flushInterval = 5000; // 5 seconds

  constructor(private eventBus: EventBus) {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async addEvent(event: DomainEvent): Promise<void> {
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer.length = 0;

    await this.eventBus.publish(events);
  }
}
```

### Event Filtering and Routing

```typescript
export class EventRouter {
  private routes = new Map<string, EventHandler[]>();

  addRoute(pattern: string, handler: EventHandler): void {
    const handlers = this.routes.get(pattern) || [];
    handlers.push(handler);
    this.routes.set(pattern, handlers);
  }

  async route(event: DomainEvent): Promise<void> {
    for (const [pattern, handlers] of this.routes) {
      if (this.matchesPattern(event.eventType, pattern)) {
        for (const handler of handlers) {
          await handler.handle(event);
        }
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    // Simple pattern matching (could use regex or wildcards)
    return eventType.includes(pattern) || pattern === '*';
  }
}
```

This event-driven architecture provides a robust foundation for scalable, maintainable, and loosely coupled systems while maintaining data consistency and providing comprehensive audit capabilities.
