import { ValueObject } from '@/lib/shared/domain/interfaces/value-object.interface';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { UserId } from '@/lib/user/domain/value-objects/user-id.vo';
import { UserRole } from '@/lib/user/domain/value-objects/user-role.vo';

export class TenantContext extends ValueObject {
  constructor(
    private readonly customerId: CustomerId | null,
    private readonly userId: UserId,
    private readonly role: UserRole,
    private readonly isSuperAdmin: boolean
  ) {
    super();
  }

  getCustomerId(): CustomerId | null {
    return this.customerId;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getRole(): UserRole {
    return this.role;
  }

  isSuperAdminUser(): boolean {
    return this.isSuperAdmin;
  }

  hasAccess(tenantId: CustomerId): boolean {
    // Super admins can access any tenant
    if (this.isSuperAdmin) {
      return true;
    }

    // If no tenant context is set, deny access
    if (!this.customerId) {
      return false;
    }

    // Check if the user is trying to access their own tenant
    return this.customerId.equals(tenantId);
  }

  canBypassTenantRestrictions(): boolean {
    return this.isSuperAdmin;
  }

  requiresTenantScope(): boolean {
    return !this.isSuperAdmin;
  }

  equals(other: TenantContext): boolean {
    if (!(other instanceof TenantContext)) {
      return false;
    }

    const thisCustomerId = this.customerId ? this.customerId.getValue() : null;
    const otherCustomerId = other.customerId ? other.customerId.getValue() : null;

    return (
      thisCustomerId === otherCustomerId &&
      this.userId.equals(other.userId) &&
      this.role.equals(other.role) &&
      this.isSuperAdmin === other.isSuperAdmin
    );
  }
}