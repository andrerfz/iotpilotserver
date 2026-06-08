import {DomainException} from './domain.exception';
import {CustomerId} from '../value-objects/customer-id.vo';

export abstract class TenantException extends DomainException {
  constructor(message: string) {
    super(message);
  }

  abstract getStatusCode(): number;
  abstract getErrorCode(): string;
}

export class TenantAccessDeniedException extends TenantException {
  constructor(userId: string, customerId: CustomerId, message?: string) {
    super(message || `Access denied for user ${userId} to customer: ${customerId.value}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'TENANT_ACCESS_DENIED';
  }
}

export class CrossTenantAccessException extends TenantException {
  constructor(attemptedId: CustomerId, actualId: CustomerId) {
    super(`Attempted access to customer ${attemptedId.value} but user belongs to ${actualId.value}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'CROSS_TENANT_ACCESS';
  }
}

export class TenantNotFoundException extends TenantException {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
  }

  getStatusCode(): number {
    return 404;
  }

  getErrorCode(): string {
    return 'TENANT_NOT_FOUND';
  }
}

export class TenantInactiveException extends TenantException {
  constructor(tenantId: string) {
    super(`Tenant is inactive: ${tenantId}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'TENANT_INACTIVE';
  }
}

export class TenantSuspendedException extends TenantException {
  constructor(tenantId: string) {
    super(`Tenant is suspended: ${tenantId}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'TENANT_SUSPENDED';
  }
}

export class TenantOperationNotAllowedException extends TenantException {
  constructor(tenantId: string, operation: string) {
    super(`Operation ${operation} not allowed for tenant: ${tenantId}`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'TENANT_OPERATION_NOT_ALLOWED';
  }
}

export class TenantQuotaExceededException extends TenantException {
  constructor(tenantId: string, resource: string) {
    super(`Tenant quota exceeded for ${resource}: ${tenantId}`);
  }

  getStatusCode(): number {
    return 429;
  }

  getErrorCode(): string {
    return 'TENANT_QUOTA_EXCEEDED';
  }
}