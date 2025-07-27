import {CustomerId} from '../value-objects/customer-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export interface TenantScoped {
  getTenantId(): string | null;
}

export class TenantIsolationEnforcer {
  /**
   * Enforces tenant isolation for a single entity
   * @throws Error if the tenant context does not have access to the entity's tenant
   */
  enforceIsolation(entity: TenantScoped, tenantContext: TenantContext): void {
    // Super admins can bypass tenant isolation
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    const tenantId = entity.getTenantId();
    if (!tenantId) {
      return;
    }

    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId || tenantId !== contextTenantId.getValue()) {
      throw new Error(
        `User ${tenantContext.getUserId().getValue()} does not have access to tenant ${tenantId}`
      );
    }
  }

  /**
   * Enforces tenant isolation for a collection of entities
   * @throws Error if the tenant context does not have access to any entity's tenant
   */
  enforceCollectionIsolation(entities: TenantScoped[], tenantContext: TenantContext): void {
    // Super admins can bypass tenant isolation
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    for (const entity of entities) {
      this.enforceIsolation(entity, tenantContext);
    }
  }

  /**
   * Filters a collection of entities to only include those that the tenant context has access to
   */
  filterByTenantAccess<T extends TenantScoped>(entities: T[], tenantContext: TenantContext): T[] {
    // Super admins can access all entities
    if (tenantContext.canBypassTenantRestrictions()) {
      return entities;
    }

    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId) {
      return [];
    }

    return entities.filter(entity => entity.getTenantId() === contextTenantId.getValue());
  }

  /**
   * Validates that cross-tenant operations are not attempted
   * @throws Error if a cross-tenant operation is attempted
   */
  preventCrossTenantOperation(sourceTenantId: CustomerId, targetTenantId: CustomerId): void {
    if (!sourceTenantId.equals(targetTenantId)) {
      throw new Error(
        `Cross-tenant operation attempted from tenant ${sourceTenantId.getValue()} to tenant ${targetTenantId.getValue()}`
      );
    }
  }

  /**
   * Validates that the tenant context has access to the specified tenant
   * @throws Error if the tenant context does not have access to the tenant
   */
  validateTenantAccess(tenantId: CustomerId, tenantContext: TenantContext): void {
    // Super admins can access all tenants
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Check if the tenant context has access to the tenant
    if (!tenantContext.hasAccess(tenantId)) {
      throw new Error(
        `User ${tenantContext.getUserId().getValue()} does not have access to tenant ${tenantId.getValue()}`
      );
    }
  }
}
