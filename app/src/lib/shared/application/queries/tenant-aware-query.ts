import { Query } from '../interfaces/query.interface';
import { TenantContext } from '../context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { TenantAccessDeniedException } from '@/lib/shared/domain/policies/tenant-validation.policy';

/**
 * Base class for all tenant-aware queries
 * Provides tenant context and validation methods
 */
export abstract class TenantAwareQuery<R> implements Query<R> {
  constructor(
    public readonly tenantContext: TenantContext
  ) {}

  /**
   * Validates that the tenant context has access to the specified tenant
   * @throws TenantAccessDeniedException if access is denied
   */
  validateTenantAccess(targetTenantId: CustomerId): void {
    if (!this.tenantContext.hasAccess(targetTenantId)) {
      throw new TenantAccessDeniedException(
        `User ${this.tenantContext.getUserId().toString()} does not have access to tenant ${targetTenantId.toString()}`
      );
    }
  }

  /**
   * Checks if the tenant context can bypass tenant restrictions
   */
  canBypassTenantRestrictions(): boolean {
    return this.tenantContext.canBypassTenantRestrictions();
  }

  /**
   * Gets the customer ID from the tenant context
   * @throws Error if no customer ID is set in the tenant context
   */
  getCustomerId(): CustomerId {
    const customerId = this.tenantContext.getCustomerId();
    if (!customerId) {
      throw new Error('No customer ID set in tenant context');
    }
    return customerId;
  }

  /**
   * Gets the customer ID from the tenant context if it exists, otherwise returns null
   */
  getCustomerIdOrNull(): CustomerId | null {
    return this.tenantContext.getCustomerId();
  }

  /**
   * Determines if the query should be scoped to a tenant
   */
  requiresTenantScope(): boolean {
    return !this.canBypassTenantRestrictions();
  }
}