import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Command for creating a new alert
 */
export class CreateAlertCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
    public readonly thresholdId: ThresholdId,
    public readonly title: string,
    public readonly message: string,
    public readonly severity: AlertSeverity,
    public readonly metadata: Record<string, any>,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new CreateAlertCommand
   * 
   * @param deviceId The ID of the device the alert is for
   * @param thresholdId The ID of the threshold that triggered the alert
   * @param title The title of the alert
   * @param message The message of the alert
   * @param severity The severity of the alert
   * @param metadata Additional metadata for the alert
   * @param customerId The customer ID the alert belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new CreateAlertCommand
   */
  static create(
    deviceId: string,
    thresholdId: string,
    title: string,
    message: string,
    severity: string,
    metadata: Record<string, any>,
    customerId: string,
    tenantContext: TenantContext
  ): CreateAlertCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new CreateAlertCommand(
      tenantContext,
      DeviceId.fromString(deviceId),
      ThresholdId.fromString(thresholdId),
      title,
      message,
      AlertSeverity.create(severity as any),
      metadata,
      CustomerId.create(customerId)
    );
  }
}