import { DomainEvent, DomainEventBase } from './domain.event';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';

/**
 * Interface for tenant-scoped domain events
 */
export interface TenantScopedEvent extends DomainEvent {
  readonly tenantId: CustomerId;
}

/**
 * Base class for all tenant-scoped domain events
 */
export abstract class TenantScopedEventBase extends DomainEventBase implements TenantScopedEvent {
  constructor(
    public readonly tenantId: CustomerId
  ) {
    super();
  }

  /**
   * Gets the ID of the tenant that this event belongs to
   */
  getTenantId(): CustomerId {
    return this.tenantId;
  }
}

/**
 * Interface for tenant-scoped event handlers
 */
export interface TenantScopedEventHandler<T extends TenantScopedEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Base class for all tenant-scoped event handlers
 */
export abstract class TenantScopedEventHandlerBase<T extends TenantScopedEvent> implements TenantScopedEventHandler<T> {
  /**
   * Handles the event
   */
  abstract handle(event: T): Promise<void>;

  /**
   * Validates that the event belongs to the specified tenant
   * @throws Error if the event does not belong to the specified tenant
   */
  protected validateEventBelongsToTenant(event: TenantScopedEvent, tenantId: CustomerId): void {
    if (!event.tenantId.equals(tenantId)) {
      throw new Error(`Event belongs to tenant ${event.tenantId.toString()} but was handled in tenant ${tenantId.toString()}`);
    }
  }
}