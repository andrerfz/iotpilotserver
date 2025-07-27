import {CustomerId} from '../value-objects/customer-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export interface TenantScoped {
  getTenantId(): string | null;
}

export class TenantDataSegregationService {
  /**
   * Filters data to only include records belonging to the tenant in the context
   */
  filterDataByTenant<T extends TenantScoped>(data: T[], tenantContext: TenantContext): T[] {
    // Super admins can see all data
    if (tenantContext.canBypassTenantRestrictions()) {
      return data;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId) {
      return [];
    }

    // Filter data to only include records belonging to the tenant
    return data.filter(item => item.getTenantId() === contextTenantId.getValue());
  }

  /**
   * Validates that data belongs to the tenant in the context
   * @throws Error if the data does not belong to the tenant in the context
   */
  validateDataBelongsToTenant<T extends TenantScoped>(data: T, tenantContext: TenantContext): void {
    // Super admins can access all data
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId) {
      throw new Error('No tenant ID set in context');
    }

    // Validate that the data belongs to the tenant
    if (data.getTenantId() !== contextTenantId.getValue()) {
      throw new Error(
        `Data belongs to tenant ${data.getTenantId()} but context is for tenant ${contextTenantId.getValue()}`
      );
    }
  }

  /**
   * Validates that all data in a collection belongs to the tenant in the context
   * @throws Error if any data does not belong to the tenant in the context
   */
  validateAllDataBelongsToTenant<T extends TenantScoped>(dataCollection: T[], tenantContext: TenantContext): void {
    // Super admins can access all data
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Validate each item in the collection
    for (const data of dataCollection) {
      this.validateDataBelongsToTenant(data, tenantContext);
    }
  }

  /**
   * Prevents cross-tenant data operations
   * @throws Error if the source and target tenant IDs are different
   */
  preventCrossTenantDataOperation(sourceTenantId: CustomerId, targetTenantId: CustomerId): void {
    if (!sourceTenantId.equals(targetTenantId)) {
      throw new Error(
        `Cross-tenant data operation attempted from tenant ${sourceTenantId.getValue()} to tenant ${targetTenantId.getValue()}`
      );
    }
  }

  /**
   * Ensures that data is only accessible within its tenant boundary
   * @throws Error if the tenant context does not have access to the tenant
   */
  enforceTenantBoundary(tenantId: CustomerId, tenantContext: TenantContext): void {
    // Super admins can access all tenants
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Validate that the tenant context has access to the tenant
    if (!tenantContext.hasAccess(tenantId)) {
      throw new Error(
        `User ${tenantContext.getUserId().getValue()} does not have access to tenant ${tenantId.getValue()}`
      );
    }
  }
}
