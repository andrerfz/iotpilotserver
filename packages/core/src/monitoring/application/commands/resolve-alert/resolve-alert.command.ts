import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Command for resolving an alert
 */
export class ResolveAlertCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly alertId: AlertId,
    public readonly userId: string,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new ResolveAlertCommand
   * 
   * @param alertId The ID of the alert to resolve
   * @param userId The ID of the user resolving the alert
   * @param customerId The customer ID the alert belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new ResolveAlertCommand
   */
  static create(
    alertId: string,
    userId: string,
    customerId: string,
    tenantContext: TenantContext
  ): ResolveAlertCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new ResolveAlertCommand(
      tenantContext,
      AlertId.fromString(alertId),
      userId,
      CustomerId.create(customerId)
    );
  }
}