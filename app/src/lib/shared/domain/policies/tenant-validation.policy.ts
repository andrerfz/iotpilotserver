import { TenantContext } from '../../application/context/tenant-context.vo';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';
import { ITenantScoped } from '../interfaces/tenant-scoped.interface';

export class TenantAccessDeniedException extends Error {
  constructor(message: string = 'Access to the requested tenant is denied') {
    super(message);
    this.name = 'TenantAccessDeniedException';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CrossTenantAccessException extends Error {
  constructor(message: string = 'Cross-tenant access is not allowed') {
    super(message);
    this.name = 'CrossTenantAccessException';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TenantValidationPolicy {
  /**
   * Validates that the tenant context has access to the specified tenant
   * @throws TenantAccessDeniedException if access is denied
   */
  static validateTenantAccess(tenantContext: TenantContext, tenantId: CustomerId): void {
    if (!tenantContext.hasAccess(tenantId)) {
      throw new TenantAccessDeniedException(
        `User ${tenantContext.getUserId().toString()} does not have access to tenant ${tenantId.toString()}`
      );
    }
  }

  /**
   * Validates that the entity belongs to the specified tenant
   * @throws CrossTenantAccessException if the entity belongs to a different tenant
   */
  static validateEntityBelongsToTenant(entity: ITenantScoped, tenantId: CustomerId): void {
    if (!entity.getTenantId().equals(tenantId)) {
      throw new CrossTenantAccessException(
        `Entity belongs to tenant ${entity.getTenantId().toString()} but access was attempted from tenant ${tenantId.toString()}`
      );
    }
  }

  /**
   * Validates that all entities in the collection belong to the specified tenant
   * @throws CrossTenantAccessException if any entity belongs to a different tenant
   */
  static validateEntitiesBelongToTenant(entities: ITenantScoped[], tenantId: CustomerId): void {
    for (const entity of entities) {
      this.validateEntityBelongsToTenant(entity, tenantId);
    }
  }

  /**
   * Validates that the tenant context has access to the entity's tenant
   * @throws TenantAccessDeniedException if access is denied
   */
  static validateTenantAccessToEntity(tenantContext: TenantContext, entity: ITenantScoped): void {
    this.validateTenantAccess(tenantContext, entity.getTenantId());
  }

  /**
   * Filters a collection of entities to only include those belonging to the specified tenant
   */
  static filterEntitiesByTenant<T extends ITenantScoped>(entities: T[], tenantId: CustomerId): T[] {
    return entities.filter(entity => entity.getTenantId().equals(tenantId));
  }

  /**
   * Checks if the tenant context can bypass tenant restrictions
   */
  static canBypassTenantRestrictions(tenantContext: TenantContext): boolean {
    return tenantContext.canBypassTenantRestrictions();
  }
}