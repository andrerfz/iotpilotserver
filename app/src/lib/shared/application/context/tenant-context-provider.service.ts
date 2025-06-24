import { Injectable } from '@nestjs/common';
import { TenantContext } from './tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { UserId } from '@/lib/user/domain/value-objects/user-id.vo';
import { UserRole } from '@/lib/user/domain/value-objects/user-role.vo';

@Injectable()
export class TenantContextProvider {
  private currentContext: TenantContext | null = null;

  /**
   * Creates a new tenant context for the given user
   */
  createContext(
    userId: UserId,
    role: UserRole,
    customerId: CustomerId | null = null,
    isSuperAdmin: boolean = false
  ): TenantContext {
    const context = new TenantContext(
      customerId,
      userId,
      role,
      isSuperAdmin
    );
    
    this.currentContext = context;
    return context;
  }

  /**
   * Creates a context for a super admin user
   */
  createSuperAdminContext(
    userId: UserId,
    role: UserRole
  ): TenantContext {
    return this.createContext(userId, role, null, true);
  }

  /**
   * Gets the current tenant context
   */
  getCurrentContext(): TenantContext | null {
    return this.currentContext;
  }

  /**
   * Sets the current tenant context
   */
  setCurrentContext(context: TenantContext): void {
    this.currentContext = context;
  }

  /**
   * Clears the current tenant context
   */
  clearCurrentContext(): void {
    this.currentContext = null;
  }

  /**
   * Checks if the current context has access to the given tenant
   */
  hasAccessToTenant(tenantId: CustomerId): boolean {
    if (!this.currentContext) {
      return false;
    }

    return this.currentContext.hasAccess(tenantId);
  }

  /**
   * Checks if the current context can bypass tenant restrictions
   */
  canBypassTenantRestrictions(): boolean {
    if (!this.currentContext) {
      return false;
    }

    return this.currentContext.canBypassTenantRestrictions();
  }
}