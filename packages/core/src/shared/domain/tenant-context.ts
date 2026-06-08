import {CustomerId} from './value-objects/customer-id.vo';
import {UserId} from '../../user/domain/value-objects/user-id.vo';
import {UserRole} from './value-objects/user-role.vo';

/**
 * TenantContext interface for multi-tenant operations
 * Provides tenant isolation and access control
 */
export interface TenantContext {
  getCustomerId(): CustomerId | null;
  getUserId(): UserId;
  getUserRole(): UserRole;
  getRole(): UserRole;
  isSuperAdmin(): boolean;
  isSuperAdminUser(): boolean;
  hasPermission(permission: string): boolean;
  getTenantId(): CustomerId | null;
  isMultiTenant(): boolean;
  getCorrelationId(): string;
  getRequestId(): string;
  getUserAgent(): string | null;
  getClientIp(): string | null;
  hasAccess(tenantId: CustomerId): boolean;
  canBypassTenantRestrictions(): boolean;
  requiresTenantScope(): boolean;
}

// Export the implementation from application layer as the single source of truth
export { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
