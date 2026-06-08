import {TenantAwareCommand} from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Device registration data for bulk operations
 */
export interface DeviceRegistrationData {
  name: string;
  ipAddress: string;
  sshUsername: string;
  sshPassword: string;
  sshPort: number;
}

/**
 * Command for registering multiple devices in bulk
 */
export class BulkRegisterDevicesCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'BulkRegisterDevicesCommand';

  private constructor(
    tenantContext: TenantContext,
    public readonly devices: DeviceRegistrationData[],
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  /**
   * Creates a new BulkRegisterDevicesCommand
   * @param devices Array of device registration data
   * @param customerId The customer ID the devices belong to
   * @param tenantContext The tenant context for the command
   */
  static create(
    devices: DeviceRegistrationData[],
    customerId?: string,
    tenantContext?: TenantContext
  ): BulkRegisterDevicesCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    if (!devices || devices.length === 0) {
      throw new Error('At least one device is required for bulk registration');
    }

    // Validate each device's data
    devices.forEach((device, index) => {
      if (!device.name || device.name.trim() === '') {
        throw new Error(`Device at index ${index} has an invalid name`);
      }
      if (!device.ipAddress || device.ipAddress.trim() === '') {
        throw new Error(`Device at index ${index} has an invalid IP address`);
      }
      if (!device.sshUsername || device.sshUsername.trim() === '') {
        throw new Error(`Device at index ${index} has an invalid SSH username`);
      }
      // Password can be empty in some cases
      if (device.sshPort <= 0 || device.sshPort > 65535) {
        throw new Error(`Device at index ${index} has an invalid SSH port`);
      }
    });

    // Handle the case when both customerId and tenantContext.getCustomerId() are null
    let customerIdVO: CustomerId;
    if (customerId) {
      customerIdVO = CustomerId.create(customerId);
    } else {
      const contextCustomerId = tenantContext.getCustomerId();
      if (!contextCustomerId) {
        throw new Error('Customer ID is required but not provided in parameters or tenant context');
      }
      customerIdVO = contextCustomerId;
    }

    return new BulkRegisterDevicesCommand(
      tenantContext,
      devices,
      customerIdVO
    );
  }
}