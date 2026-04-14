import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {v4 as uuidv4} from 'uuid';

/**
 * TenantContext implementation for application layer
 * Implements the domain TenantContext interface
 */
export class TenantContextImpl implements TenantContext {
  private readonly _correlationId: string;
  private readonly _requestId: string;

  constructor(
    private readonly customerId: CustomerId | null,
    private readonly userId: UserId,
    private readonly role: UserRole,
    private readonly _isSuperAdmin: boolean,
    correlationId?: string,
    requestId?: string,
    private readonly _userAgent?: string,
    private readonly _clientIp?: string
  ) {
    this._correlationId = correlationId || uuidv4();
    this._requestId = requestId || uuidv4();
  }

  // Factory methods
  static create(customerId: CustomerId, userId?: UserId, role?: UserRole): TenantContextImpl {
    return new TenantContextImpl(
      customerId,
      userId || UserId.create('default-user'),
      role || UserRole.create('USER'),
      false
    );
  }

  static createCustomerAdmin(customerId: CustomerId, userId?: UserId): TenantContextImpl {
    return new TenantContextImpl(
      customerId,
      userId || UserId.create('customer-admin-user'),
      UserRole.create('ADMIN'),
      false
    );
  }

  static createSuperAdmin(userId?: UserId): TenantContextImpl {
    return new TenantContextImpl(
      null,
      userId || UserId.create('superadmin-user'),
      UserRole.create('SUPERADMIN'),
      true
    );
  }

  static createFromRequest(
    customerId: CustomerId | null,
    userId: UserId,
    userRole: UserRole,
    correlationId: string,
    requestId: string,
    userAgent?: string,
    clientIp?: string
  ): TenantContextImpl {
    const isSuperAdmin = userRole.value === 'SUPERADMIN';
    return new TenantContextImpl(
      customerId,
      userId,
      userRole,
      isSuperAdmin,
      correlationId,
      requestId,
      userAgent,
      clientIp
    );
  }

  static superAdmin(correlationId: string = 'superadmin'): TenantContextImpl {
    return new TenantContextImpl(
      null,
      UserId.fromString('superadmin'),
      UserRole.fromString('SUPERADMIN'),
      true,
      correlationId,
      'superadmin-request'
    );
  }

  static forCustomer(
    customerId: CustomerId,
    userId: UserId,
    userRole: UserRole,
    correlationId: string
  ): TenantContextImpl {
    return new TenantContextImpl(
      customerId,
      userId,
      userRole,
      userRole.value === 'SUPERADMIN',
      correlationId,
      `customer-${customerId.value}`
    );
  }

  // Interface implementation
  getCustomerId(): CustomerId | null {
    return this.customerId;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getRole(): UserRole {
    return this.role;
  }

  getUserRole(): UserRole {
    return this.role;
  }

  isSuperAdmin(): boolean {
    return this._isSuperAdmin;
  }

  isSuperAdminUser(): boolean {
    return this._isSuperAdmin;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getRolePermissions(this.role.value);
    return permissions.includes(permission) || permissions.includes('*');
  }

  getTenantId(): CustomerId | null {
    return this.customerId;
  }

  isMultiTenant(): boolean {
    return this.customerId !== null;
  }

  getCorrelationId(): string {
    return this._correlationId;
  }

  getRequestId(): string {
    return this._requestId;
  }

  getUserAgent(): string | null {
    return this._userAgent || null;
  }

  getClientIp(): string | null {
    return this._clientIp || null;
  }

  // Access control
  hasAccess(tenantId: CustomerId): boolean {
    if (this._isSuperAdmin) {
      return true;
    }
    if (!this.customerId) {
      return false;
    }
    return this.customerId.equals(tenantId);
  }

  canBypassTenantRestrictions(): boolean {
    return this._isSuperAdmin;
  }

  requiresTenantScope(): boolean {
    return !this._isSuperAdmin;
  }

  equals(other: TenantContext): boolean {
    if (!(other instanceof TenantContextImpl)) {
      return false;
    }

    const thisCustomerId = this.customerId ? this.customerId.getValue() : null;
    const otherCustomerId = other.customerId ? other.customerId.getValue() : null;

    return (
      thisCustomerId === otherCustomerId &&
      this.userId.equals(other.userId) &&
      this.role.equals(other.role) &&
      this._isSuperAdmin === other._isSuperAdmin
    );
  }

  private getRolePermissions(role: string): string[] {
    switch (role) {
      case 'SUPERADMIN':
        return ['*'];
      case 'ADMIN':
        return [
          'devices:read', 'devices:write', 'devices:delete',
          'users:read', 'users:write', 'users:delete',
          'customers:read', 'customers:write',
          'monitoring:read', 'monitoring:write'
        ];
      case 'MANAGER':
        return [
          'devices:read', 'devices:write', 'devices:execute',
          'monitoring:read', 'monitoring:write',
          'alerts:read', 'alerts:manage'
        ];
      case 'TECHNICIAN':
        return [
          'devices:read', 'devices:execute', 'devices:diagnose',
          'monitoring:read', 'alerts:read'
        ];
      case 'VIEWER':
        return [
          'devices:read', 'monitoring:read', 'alerts:read'
        ];
      default:
        return [];
    }
  }
}
