import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Time range for metrics query
 */
export interface MetricsTimeRange {
  from: Date;
  to: Date;
}

/**
 * Query for retrieving metrics for a device
 */
export class GetDeviceMetricsQuery extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'GetDeviceMetricsQuery';

  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
    public readonly timeRange: MetricsTimeRange,
    public readonly metricTypes: string[],
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new GetDeviceMetricsQuery
   * @param deviceId The ID of the device to get metrics for
   * @param timeRange The time range for the metrics
   * @param metricTypes The types of metrics to retrieve (e.g., 'cpu', 'memory', 'disk')
   * @param customerId The customer ID the device belongs to
   * @param tenantContext The tenant context for the query
   */
  static create(
    deviceId: string,
    timeRange: { from: Date | string; to: Date | string },
    metricTypes: string[] = ['cpu', 'memory', 'disk', 'network'],
    customerId?: string,
    tenantContext?: TenantContext
  ): GetDeviceMetricsQuery {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    // Convert string dates to Date objects if needed
    const from = typeof timeRange.from === 'string' ? new Date(timeRange.from) : timeRange.from;
    const to = typeof timeRange.to === 'string' ? new Date(timeRange.to) : timeRange.to;

    // Validate time range
    if (from > to) {
      throw new Error('Invalid time range: "from" date must be before "to" date');
    }

    const deviceIdVO = DeviceId.create(deviceId);
    
    // Handle customerId
    let customerIdVO: CustomerId;
    if (customerId) {
      customerIdVO = CustomerId.create(customerId);
    } else {
      const contextCustomerId = tenantContext.getCustomerId();
      if (!contextCustomerId) {
        throw new Error('No customer ID provided and none available in tenant context');
      }
      customerIdVO = contextCustomerId;
    }

    return new GetDeviceMetricsQuery(
      tenantContext,
      deviceIdVO,
      { from, to },
      metricTypes,
      customerIdVO
    );
  }
}