import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {Device} from '@iotpilot/core/device/domain/entities/device.entity';

/**
 * Query for retrieving a single device by ID
 */
export class GetDeviceQuery extends TenantAwareQuery<Device> {
  /** Static type identifier that survives minification */
  static readonly type = 'GetDeviceQuery';

  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
    public readonly customerId?: CustomerId
  ) {
    super(tenantContext);
    if (customerId) {
      this.validateTenantAccess(customerId);
    }
  }

  /**
   * Creates a new GetDeviceQuery
   * @param deviceId The ID of the device to retrieve
   * @param customerId The customer ID the device belongs to
   * @param tenantContext The tenant context for the query
   */
  static create(
    deviceId: string,
    customerId?: string,
    tenantContext?: TenantContext
  ): GetDeviceQuery {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    const deviceIdVO = DeviceId.create(deviceId);

    // Handle customerId - SUPERADMIN can query without a customer ID
    let customerIdVO: CustomerId | undefined;
    if (customerId) {
      customerIdVO = CustomerId.create(customerId);
    } else {
      customerIdVO = tenantContext.getCustomerId() || undefined;
    }

    return new GetDeviceQuery(
      tenantContext,
      deviceIdVO,
      customerIdVO
    );
  }
}