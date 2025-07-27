import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {AlertId} from '@/lib/monitoring/domain/value-objects/alert-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Command for acknowledging an alert
 */
export class AcknowledgeAlertCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'AcknowledgeAlertCommand';

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
   * Creates a new AcknowledgeAlertCommand
   * 
   * @param alertId The ID of the alert to acknowledge
   * @param userId The ID of the user acknowledging the alert
   * @param customerId The customer ID the alert belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new AcknowledgeAlertCommand
   */
  static create(
    alertId: string,
    userId: string,
    customerId: string,
    tenantContext: TenantContext
  ): AcknowledgeAlertCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new AcknowledgeAlertCommand(
      tenantContext,
      AlertId.fromString(alertId),
      userId,
      CustomerId.create(customerId)
    );
  }
}