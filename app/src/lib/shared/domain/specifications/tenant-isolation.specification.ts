import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { ITenantScoped } from '@/lib/shared/domain/interfaces/tenant-scoped.interface';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';

/**
 * Base specification interface
 */
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

/**
 * Specification for checking if an entity belongs to a specific tenant
 */
export class BelongsToTenantSpecification implements Specification<ITenantScoped> {
  constructor(private readonly tenantId: CustomerId) {}

  isSatisfiedBy(entity: ITenantScoped): boolean {
    return entity.getTenantId().equals(this.tenantId);
  }
}

/**
 * Specification for checking if a tenant context has access to a specific tenant
 */
export class HasTenantAccessSpecification implements Specification<TenantContext> {
  constructor(private readonly tenantId: CustomerId) {}

  isSatisfiedBy(tenantContext: TenantContext): boolean {
    return tenantContext.hasAccess(this.tenantId);
  }
}

/**
 * Specification for checking if a tenant context can bypass tenant restrictions
 */
export class CanBypassTenantRestrictionsSpecification implements Specification<TenantContext> {
  isSatisfiedBy(tenantContext: TenantContext): boolean {
    return tenantContext.canBypassTenantRestrictions();
  }
}

/**
 * Composite specification for checking if a tenant context has access to an entity
 */
export class HasAccessToEntitySpecification implements Specification<{
  tenantContext: TenantContext;
  entity: ITenantScoped;
}> {
  isSatisfiedBy(candidate: { tenantContext: TenantContext; entity: ITenantScoped }): boolean {
    const { tenantContext, entity } = candidate;
    
    // Super admins can access any entity
    if (tenantContext.canBypassTenantRestrictions()) {
      return true;
    }
    
    // Otherwise, check if the tenant context has access to the entity's tenant
    return tenantContext.hasAccess(entity.getTenantId());
  }
}

/**
 * Utility class for working with tenant isolation specifications
 */
export class TenantIsolationSpecifications {
  /**
   * Creates a specification for checking if an entity belongs to a specific tenant
   */
  static belongsToTenant(tenantId: CustomerId): BelongsToTenantSpecification {
    return new BelongsToTenantSpecification(tenantId);
  }

  /**
   * Creates a specification for checking if a tenant context has access to a specific tenant
   */
  static hasTenantAccess(tenantId: CustomerId): HasTenantAccessSpecification {
    return new HasTenantAccessSpecification(tenantId);
  }

  /**
   * Creates a specification for checking if a tenant context can bypass tenant restrictions
   */
  static canBypassTenantRestrictions(): CanBypassTenantRestrictionsSpecification {
    return new CanBypassTenantRestrictionsSpecification();
  }

  /**
   * Creates a specification for checking if a tenant context has access to an entity
   */
  static hasAccessToEntity(): HasAccessToEntitySpecification {
    return new HasAccessToEntitySpecification();
  }

  /**
   * Filters a collection of entities to only include those belonging to a specific tenant
   */
  static filterByTenant<T extends ITenantScoped>(entities: T[], tenantId: CustomerId): T[] {
    const spec = this.belongsToTenant(tenantId);
    return entities.filter(entity => spec.isSatisfiedBy(entity));
  }
}