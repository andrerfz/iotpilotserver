import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export interface DeviceStatusResponse {
  status: string;
  lastSeen: Date | null;
  metrics?: any;
}

/**
 * Query for retrieving the current status of a device
 */
export class GetDeviceStatusQuery extends TenantAwareQuery<DeviceStatusResponse> {
  /** Static type identifier that survives minification */
  static readonly type = 'GetDeviceStatusQuery';

  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
    public readonly includeMetrics: boolean,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new GetDeviceStatusQuery
   * @param deviceId The ID of the device to get status for
   * @param includeMetrics Whether to include latest metrics in the status
   * @param customerId The customer ID the device belongs to
   * @param tenantContext The tenant context for the query
   */
  static create(
    deviceId: string,
    includeMetrics: boolean = true,
    customerId?: string,
    tenantContext?: TenantContext
  ): GetDeviceStatusQuery {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
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

    return new GetDeviceStatusQuery(
      tenantContext,
      deviceIdVO,
      includeMetrics,
      customerIdVO
    );
  }
}