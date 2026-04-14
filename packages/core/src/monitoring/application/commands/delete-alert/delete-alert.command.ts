import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Command for deleting an alert
 */
export class DeleteAlertCommand extends TenantAwareCommand {
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
   * Creates a new DeleteAlertCommand
   * 
   * @param alertId The ID of the alert to delete
   * @param userId The ID of the user deleting the alert
   * @param customerId The customer ID the alert belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new DeleteAlertCommand
   */
  static create(
    alertId: string,
    userId: string,
    customerId: string,
    tenantContext: TenantContext
  ): DeleteAlertCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new DeleteAlertCommand(
      tenantContext,
      AlertId.fromString(alertId),
      userId,
      CustomerId.create(customerId)
    );
  }
}