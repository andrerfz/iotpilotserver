import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Read-only query interface for resolving notification targets.
 * Abstracts the user and preference lookups needed by NotificationRoutingService,
 * keeping the domain service free of infrastructure dependencies.
 */
export interface NotificationTargetRepository {
  /** Returns all ADMIN/SUPERADMIN users in the tenant with their emails. */
  findAdminUsersInTenant(
    customerId: CustomerId,
  ): Promise<Array<{ id: string; email: string }>>;

  /**
   * Returns the value of a NOTIFICATIONS-category user preference toggle,
   * or null if not set (caller should apply default = enabled).
   */
  getUserNotificationToggle(userId: string, toggleKey: string): Promise<string | null>;
}
