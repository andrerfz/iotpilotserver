import { Injectable } from '@nestjs/common';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { TenantScopedLoggingService } from '../logging/tenant-scoped-logging.service';

/**
 * Exception thrown when a tenant boundary violation is detected
 */
export class TenantBoundaryViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantBoundaryViolationException';
  }
}

/**
 * Service for validating tenant boundaries and preventing cross-tenant access
 */
@Injectable()
export class TenantBoundaryValidator {
  constructor(private readonly loggingService: TenantScopedLoggingService) {}

  /**
   * Validate that the tenant context has access to the specified tenant
   * @param tenantContext The tenant context
   * @param targetTenantId The target tenant ID
   * @param operation The operation being performed (for logging)
   * @throws TenantBoundaryViolationException if access is not allowed
   */
  validateTenantAccess(
    tenantContext: TenantContext,
    targetTenantId: CustomerId,
    operation: string
  ): void {
    // SUPERADMIN can access any tenant
    if (tenantContext.canBypassTenantRestrictions()) {
      this.loggingService.debug(
        `SUPERADMIN bypass for tenant boundary on operation: ${operation}`,
        tenantContext,
        { targetTenantId: targetTenantId.getValue() }
      );
      return;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();

    // If no tenant ID in context, access is denied
    if (!contextTenantId) {
      this.logAndThrowViolation(
        'Tenant context does not have a customer ID',
        tenantContext,
        targetTenantId,
        operation
      );
    }

    // Check if the tenant IDs match
    if (!contextTenantId.equals(targetTenantId)) {
      this.logAndThrowViolation(
        'Cross-tenant access attempt detected',
        tenantContext,
        targetTenantId,
        operation
      );
    }
  }

  /**
   * Validate that the tenant context has access to all specified tenants
   * @param tenantContext The tenant context
   * @param targetTenantIds Array of target tenant IDs
   * @param operation The operation being performed (for logging)
   * @throws TenantBoundaryViolationException if access is not allowed to any tenant
   */
  validateMultiTenantAccess(
    tenantContext: TenantContext,
    targetTenantIds: CustomerId[],
    operation: string
  ): void {
    // SUPERADMIN can access any tenant
    if (tenantContext.canBypassTenantRestrictions()) {
      this.loggingService.debug(
        `SUPERADMIN bypass for multi-tenant boundary on operation: ${operation}`,
        tenantContext,
        { targetTenantIds: targetTenantIds.map(id => id.getValue()) }
      );
      return;
    }

    // Get the tenant ID from the context
    const contextTenantId = tenantContext.getCustomerId();

    // If no tenant ID in context, access is denied
    if (!contextTenantId) {
      this.logAndThrowViolation(
        'Tenant context does not have a customer ID for multi-tenant operation',
        tenantContext,
        targetTenantIds[0], // Log the first tenant ID for reference
        operation
      );
    }

    // Check if all tenant IDs are accessible
    for (const targetTenantId of targetTenantIds) {
      if (!contextTenantId.equals(targetTenantId)) {
        this.logAndThrowViolation(
          'Cross-tenant access attempt detected in multi-tenant operation',
          tenantContext,
          targetTenantId,
          operation
        );
      }
    }
  }

  /**
   * Validate that the entity belongs to the tenant in the context
   * @param tenantContext The tenant context
   * @param entity The entity to validate
   * @param operation The operation being performed (for logging)
   * @throws TenantBoundaryViolationException if the entity doesn't belong to the tenant
   */
  validateEntityBelongsToTenant<T extends { getTenantId(): CustomerId }>(
    tenantContext: TenantContext,
    entity: T,
    operation: string
  ): void {
    const entityTenantId = entity.getTenantId();
    this.validateTenantAccess(tenantContext, entityTenantId, operation);
  }

  /**
   * Log a tenant boundary violation and throw an exception
   * @param message The error message
   * @param tenantContext The tenant context
   * @param targetTenantId The target tenant ID
   * @param operation The operation being performed
   * @throws TenantBoundaryViolationException
   */
  private logAndThrowViolation(
    message: string,
    tenantContext: TenantContext,
    targetTenantId: CustomerId,
    operation: string
  ): never {
    const contextTenantId = tenantContext.getCustomerId();
    const userId = tenantContext.getUserId()?.getValue() || 'unknown';
    
    const violationDetails = {
      userId,
      contextTenantId: contextTenantId?.getValue() || null,
      targetTenantId: targetTenantId.getValue(),
      operation,
      timestamp: new Date().toISOString()
    };
    
    this.loggingService.error(
      `SECURITY VIOLATION: ${message}`,
      tenantContext,
      violationDetails
    );
    
    throw new TenantBoundaryViolationException(
      `Tenant boundary violation: ${message}`
    );
  }
}