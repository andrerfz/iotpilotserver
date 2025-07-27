import {Entity} from '../interfaces/entity.interface';
import {ITenantScoped} from '../interfaces/tenant-scoped.interface';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Base class for all tenant-scoped entities
 * Implements the ITenantScoped interface and provides common functionality
 */
export abstract class TenantScopedEntity<T> extends Entity<T> implements ITenantScoped {
  public readonly customerId: CustomerId | undefined;

  constructor(id: T, customerId?: CustomerId) {
    super(id);
    this.customerId = customerId;
  }

  /**
   * Gets the ID of this entity (public getter)
   */
  get id(): T {
    return this._entityId;
  }

  /**
   * Gets the ID of the tenant that this entity belongs to
   */
  getTenantId(): CustomerId {
    if (!this.customerId) {
      throw new Error('Entity does not have a tenant ID');
    }
    return this.customerId;
  }

  /**
   * Checks if this entity belongs to the specified tenant
   */
  belongsToTenant(tenantId: CustomerId): boolean {
    if (!this.customerId) return false;
    return this.customerId.equals(tenantId);
  }

  /**
   * Validates that this entity belongs to the specified tenant
   * @throws Error if the entity does not belong to the specified tenant
   */
  validateBelongsToTenant(tenantId: CustomerId): void {
    if (!this.belongsToTenant(tenantId)) {
      throw new Error(`Entity does not belong to tenant ${tenantId.toString()}`);
    }
  }

  /**
   * Gets the ID of this entity - must be implemented by subclasses
   */
  abstract getId(): T;
}
