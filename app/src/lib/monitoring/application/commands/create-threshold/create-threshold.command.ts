import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {AlertSeverity} from '@/lib/monitoring/domain/value-objects/alert-severity.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ComparisonOperator, ThresholdType} from '@/lib/monitoring/domain/entities/threshold.entity';

/**
 * Command for creating a new threshold
 */
export class CreateThresholdCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId | null,
    public readonly name: string,
    public readonly description: string,
    public readonly metricName: string,
    public readonly operator: ComparisonOperator,
    public readonly value: number,
    public readonly unit: string,
    public readonly severity: AlertSeverity,
    public readonly type: ThresholdType,
    public readonly cooldownMinutes: number,
    public readonly metadata: Record<string, any>,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new CreateThresholdCommand
   * 
   * @param deviceId The ID of the device the threshold applies to, or null for global thresholds
   * @param name The name of the threshold
   * @param description The description of the threshold
   * @param metricName The name of the metric to monitor
   * @param operator The comparison operator to use
   * @param value The threshold value
   * @param unit The unit of the threshold value
   * @param severity The severity of alerts triggered by this threshold
   * @param type The type of the threshold
   * @param cooldownMinutes The cooldown period in minutes between alerts
   * @param metadata Additional metadata for the threshold
   * @param customerId The customer ID the threshold belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new CreateThresholdCommand
   */
  static create(
    deviceId: string | null,
    name: string,
    description: string,
    metricName: string,
    operator: ComparisonOperator,
    value: number,
    unit: string,
    severity: string,
    type: ThresholdType,
    cooldownMinutes: number,
    metadata: Record<string, any>,
    customerId: string,
    tenantContext: TenantContext
  ): CreateThresholdCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new CreateThresholdCommand(
      tenantContext,
      deviceId ? DeviceId.fromString(deviceId) : null,
      name,
      description,
      metricName,
      operator,
      value,
      unit,
      AlertSeverity.create(severity as any),
      type,
      cooldownMinutes,
      metadata,
      CustomerId.create(customerId)
    );
  }
}