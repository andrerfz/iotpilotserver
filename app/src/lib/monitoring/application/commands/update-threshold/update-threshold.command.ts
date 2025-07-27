import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {AlertSeverity} from '@/lib/monitoring/domain/value-objects/alert-severity.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ComparisonOperator, ThresholdType} from '@/lib/monitoring/domain/entities/threshold.entity';
import {ThresholdId} from '@/lib/monitoring/domain/value-objects/threshold-id.vo';

/**
 * Command for updating an existing threshold
 */
export class UpdateThresholdCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly thresholdId: ThresholdId,
    public readonly name: string,
    public readonly description: string,
    public readonly metricName: string,
    public readonly operator: ComparisonOperator,
    public readonly value: number,
    public readonly unit: string,
    public readonly severity: AlertSeverity,
    public readonly type: ThresholdType,
    public readonly cooldownMinutes: number,
    public readonly enabled: boolean,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new UpdateThresholdCommand
   * 
   * @param thresholdId The ID of the threshold to update
   * @param name The updated name of the threshold
   * @param description The updated description of the threshold
   * @param metricName The updated name of the metric to monitor
   * @param operator The updated comparison operator to use
   * @param value The updated threshold value
   * @param unit The updated unit of the threshold value
   * @param severity The updated severity of alerts triggered by this threshold
   * @param type The updated type of the threshold
   * @param cooldownMinutes The updated cooldown period in minutes between alerts
   * @param enabled Whether the threshold should be enabled or disabled
   * @param customerId The customer ID the threshold belongs to
   * @param tenantContext The tenant context for the command
   * @returns A new UpdateThresholdCommand
   */
  static create(
    thresholdId: string,
    name: string,
    description: string,
    metricName: string,
    operator: ComparisonOperator,
    value: number,
    unit: string,
    severity: string,
    type: ThresholdType,
    cooldownMinutes: number,
    enabled: boolean,
    customerId: string,
    tenantContext: TenantContext
  ): UpdateThresholdCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    return new UpdateThresholdCommand(
      tenantContext,
      ThresholdId.fromString(thresholdId),
      name,
      description,
      metricName,
      operator,
      value,
      unit,
      AlertSeverity.create(severity as any),
      type,
      cooldownMinutes,
      enabled,
      CustomerId.create(customerId)
    );
  }
}