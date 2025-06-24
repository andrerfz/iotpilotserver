import { Injectable } from '@nestjs/common';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { ITenantScoped } from '@/lib/shared/domain/interfaces/tenant-scoped.interface';
import { CrossTenantAccessException, TenantAccessDeniedException } from '@/lib/shared/domain/exceptions/tenant.exception';

@Injectable()
export class TenantDataSegregationService {
  /**
   * Filters data to only include records belonging to the tenant in the context
   * @param data Array of data objects that implement ITenantScoped
   * @param tenantContext The tenant context to filter by
   * @returns Filtered array of data objects
   */
  filterDataByTenant<T extends ITenantScoped>(data: T[], tenantContext: TenantContext): T[] {
    // Super admins can see all data
    if (tenantContext.canBypassTenantRestrictions()) {
      return data;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId) {
      // If no tenant ID is set in the context, return empty array
      return [];
    }

    // Filter data to only include records belonging to the tenant
    return data.filter(item => item.getTenantId().equals(contextTenantId));
  }

  /**
   * Validates that data belongs to the tenant in the context
   * @param data Data object that implements ITenantScoped
   * @param tenantContext The tenant context to validate against
   * @throws TenantAccessDeniedException if the data does not belong to the tenant in the context
   */
  validateDataBelongsToTenant<T extends ITenantScoped>(data: T, tenantContext: TenantContext): void {
    // Super admins can access all data
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();
    if (!contextTenantId) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        data.getTenantId(),
        'No tenant ID set in context'
      );
    }

    // Validate that the data belongs to the tenant
    if (!data.getTenantId().equals(contextTenantId)) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        data.getTenantId(),
        `Data belongs to tenant ${data.getTenantId().toString()} but context is for tenant ${contextTenantId.toString()}`
      );
    }
  }

  /**
   * Validates that all data in a collection belongs to the tenant in the context
   * @param dataCollection Array of data objects that implement ITenantScoped
   * @param tenantContext The tenant context to validate against
   * @throws TenantAccessDeniedException if any data does not belong to the tenant in the context
   */
  validateAllDataBelongsToTenant<T extends ITenantScoped>(dataCollection: T[], tenantContext: TenantContext): void {
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
   * @param sourceTenantId The source tenant ID
   * @param targetTenantId The target tenant ID
   * @throws CrossTenantAccessException if the source and target tenant IDs are different
   */
  preventCrossTenantDataOperation(sourceTenantId: CustomerId, targetTenantId: CustomerId): void {
    if (!sourceTenantId.equals(targetTenantId)) {
      throw new CrossTenantAccessException(
        sourceTenantId,
        targetTenantId,
        `Cross-tenant data operation attempted from tenant ${sourceTenantId.toString()} to tenant ${targetTenantId.toString()}`
      );
    }
  }

  /**
   * Ensures that data is only accessible within its tenant boundary
   * @param tenantId The tenant ID to enforce
   * @param tenantContext The tenant context to validate against
   * @throws TenantAccessDeniedException if the tenant context does not have access to the tenant
   */
  enforceTenantBoundary(tenantId: CustomerId, tenantContext: TenantContext): void {
    // Super admins can access all tenants
    if (tenantContext.canBypassTenantRestrictions()) {
      return;
    }

    // Validate that the tenant context has access to the tenant
    if (!tenantContext.hasAccess(tenantId)) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        tenantId,
        `User ${tenantContext.getUserId().toString()} does not have access to tenant ${tenantId.toString()}`
      );
    }
  }
}