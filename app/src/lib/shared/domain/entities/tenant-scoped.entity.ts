import { Entity } from '../interfaces/entity.interface';
import { ITenantScoped } from '../interfaces/tenant-scoped.interface';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Base class for all tenant-scoped entities
 * Implements the ITenantScoped interface and provides common functionality
 */
export abstract class TenantScopedEntity<T> extends Entity<T> implements ITenantScoped {
  constructor(
    id: T,
    private readonly tenantId: CustomerId
  ) {
    super(id);
  }

  /**
   * Gets the ID of the tenant that this entity belongs to
   */
  getTenantId(): CustomerId {
    return this.tenantId;
  }

  /**
   * Checks if this entity belongs to the specified tenant
   */
  belongsToTenant(tenantId: CustomerId): boolean {
    return this.tenantId.equals(tenantId);
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
   * Gets the ID of this entity
   */
  abstract getId(): T;
}