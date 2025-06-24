import { DomainException } from './domain.exception';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Base class for all tenant-related exceptions
 */
export class TenantException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Exception thrown when tenant access is denied
 */
export class TenantAccessDeniedException extends TenantException {
  constructor(
    public readonly userId: string,
    public readonly tenantId: CustomerId | string,
    message: string = `User ${userId} does not have access to tenant ${typeof tenantId === 'string' ? tenantId : tenantId.toString()}`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when cross-tenant access is attempted
 */
export class CrossTenantAccessException extends TenantException {
  constructor(
    public readonly sourceTenantId: CustomerId | string,
    public readonly targetTenantId: CustomerId | string,
    message: string = `Cross-tenant access attempted from tenant ${typeof sourceTenantId === 'string' ? sourceTenantId : sourceTenantId.toString()} to tenant ${typeof targetTenantId === 'string' ? targetTenantId : targetTenantId.toString()}`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when a tenant is not found
 */
export class TenantNotFoundException extends TenantException {
  constructor(
    public readonly tenantId: CustomerId | string,
    message: string = `Tenant with ID ${typeof tenantId === 'string' ? tenantId : tenantId.toString()} not found`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when a tenant is inactive
 */
export class TenantInactiveException extends TenantException {
  constructor(
    public readonly tenantId: CustomerId | string,
    message: string = `Tenant with ID ${typeof tenantId === 'string' ? tenantId : tenantId.toString()} is inactive`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when a tenant is suspended
 */
export class TenantSuspendedException extends TenantException {
  constructor(
    public readonly tenantId: CustomerId | string,
    message: string = `Tenant with ID ${typeof tenantId === 'string' ? tenantId : tenantId.toString()} is suspended`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when a tenant operation is not allowed
 */
export class TenantOperationNotAllowedException extends TenantException {
  constructor(
    public readonly tenantId: CustomerId | string,
    public readonly operation: string,
    message: string = `Operation ${operation} is not allowed for tenant ${typeof tenantId === 'string' ? tenantId : tenantId.toString()}`
  ) {
    super(message);
  }
}

/**
 * Exception thrown when a tenant quota is exceeded
 */
export class TenantQuotaExceededException extends TenantException {
  constructor(
    public readonly tenantId: CustomerId | string,
    public readonly quotaType: string,
    public readonly limit: number,
    message: string = `Quota ${quotaType} exceeded for tenant ${typeof tenantId === 'string' ? tenantId : tenantId.toString()}. Limit: ${limit}`
  ) {
    super(message);
  }
}