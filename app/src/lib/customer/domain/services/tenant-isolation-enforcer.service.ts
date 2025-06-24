import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { CustomerId } from '../value-objects/customer-id.vo';
import { TenantContext } from '../../../shared/application/context/tenant-context.vo';
import { ITenantScoped } from '../../../shared/domain/interfaces/tenant-scoped.interface';
import { CrossTenantAccessException, TenantAccessDeniedException } from '../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class TenantIsolationEnforcer {
  /**
   * Enforces tenant isolation for a single entity
   * @throws TenantAccessDeniedException if the tenant context does not have access to the entity's tenant
   */
  enforceIsolation(entity: ITenantScoped, tenantContext: TenantContext): void {
    // Super admins can bypass tenant isolation
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Check if the tenant context has access to the entity's tenant
    if (!tenantContext.hasAccess(entity.getTenantId())) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        entity.getTenantId(),
        `User ${tenantContext.getUserId().toString()} does not have access to tenant ${entity.getTenantId().toString()}`
      );
    }
  }

  /**
   * Enforces tenant isolation for a collection of entities
   * @throws TenantAccessDeniedException if the tenant context does not have access to any entity's tenant
   */
  enforceCollectionIsolation(entities: ITenantScoped[], tenantContext: TenantContext): void {
    // Super admins can bypass tenant isolation
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Check if the tenant context has access to each entity's tenant
    for (const entity of entities) {
      this.enforceIsolation(entity, tenantContext);
    }
  }

  /**
   * Filters a collection of entities to only include those that the tenant context has access to
   */
  filterByTenantAccess<T extends ITenantScoped>(entities: T[], tenantContext: TenantContext): T[] {
    // Super admins can access all entities
    if (tenantContext.canBypassTenantRestrictions()) {
      return entities;
    }

    // Filter entities by tenant access
    return entities.filter(entity => tenantContext.hasAccess(entity.getTenantId()));
  }

  /**
   * Validates that cross-tenant operations are not attempted
   * @throws CrossTenantAccessException if a cross-tenant operation is attempted
   */
  preventCrossTenantOperation(sourceTenantId: CustomerId, targetTenantId: CustomerId): void {
    if (!sourceTenantId.equals(targetTenantId)) {
      throw new CrossTenantAccessException(
        sourceTenantId,
        targetTenantId,
        `Cross-tenant operation attempted from tenant ${sourceTenantId.toString()} to tenant ${targetTenantId.toString()}`
      );
    }
  }

  /**
   * Validates that the tenant context has access to the specified tenant
   * @throws TenantAccessDeniedException if the tenant context does not have access to the tenant
   */
  validateTenantAccess(tenantId: CustomerId, tenantContext: TenantContext): void {
    // Super admins can access all tenants
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Check if the tenant context has access to the tenant
    if (!tenantContext.hasAccess(tenantId)) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        tenantId,
        `User ${tenantContext.getUserId().toString()} does not have access to tenant ${tenantId.toString()}`
      );
    }
  }
}