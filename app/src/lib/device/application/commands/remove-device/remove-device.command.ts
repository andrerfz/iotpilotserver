import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Command for removing a device
 */
export class RemoveDeviceCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'RemoveDeviceCommand';

  private constructor(
    tenantContext: TenantContext,
    public readonly deviceId: DeviceId,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new RemoveDeviceCommand
   * @param deviceId The ID of the device to remove
   * @param customerId The customer ID the device belongs to
   * @param tenantContext The tenant context for the command
   */
  static create(
    deviceId: string,
    customerId?: string,
    tenantContext?: TenantContext
  ): RemoveDeviceCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    const deviceIdVO = DeviceId.create(deviceId);
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

    return new RemoveDeviceCommand(
      tenantContext,
      deviceIdVO,
      customerIdVO
    );
  }
}