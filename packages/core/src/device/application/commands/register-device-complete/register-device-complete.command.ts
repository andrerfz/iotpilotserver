import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

/**
 * Complete device registration data
 */
export interface DeviceRegistrationData {
  deviceId: string;
  hostname: string;
  deviceType: string;
  deviceModel?: string;
  architecture: string;
  location?: string;
  ipAddress?: string;
  tailscaleIp?: string;
  macAddress?: string;
  ownerId?: string;
  customerId: string;
}

/**
 * Command for registering a new device with complete information
 */
export class RegisterDeviceCompleteCommand implements Command {
  /** Static type identifier that survives minification */
  static readonly type = 'RegisterDeviceCompleteCommand';

  private constructor(
    public readonly deviceData: DeviceRegistrationData,
    public readonly tenantContext: TenantContext
  ) {
    // Validate tenant access
    if (tenantContext.getCustomerId()?.getValue() !== deviceData.customerId && 
        !tenantContext.isSuperAdminUser()) {
      throw new Error('Tenant access violation: Cannot register device for different customer');
    }
  }

  /**
   * Gets the tenant context
   */
  getTenantContext(): TenantContext {
    return this.tenantContext;
  }

  /**
   * Creates a new RegisterDeviceCompleteCommand
   * @param deviceData The complete device registration data
   * @param tenantContext The tenant context for the command
   */
  static create(
    deviceData: DeviceRegistrationData,
    tenantContext: TenantContext
  ): RegisterDeviceCompleteCommand {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    if (!deviceData.deviceId || deviceData.deviceId.trim() === '') {
      throw new Error('Device ID is required');
    }

    if (!deviceData.hostname || deviceData.hostname.trim() === '') {
      throw new Error('Hostname is required');
    }

    if (!deviceData.deviceType || deviceData.deviceType.trim() === '') {
      throw new Error('Device type is required');
    }

    if (!deviceData.architecture || deviceData.architecture.trim() === '') {
      throw new Error('Architecture is required');
    }

    if (!deviceData.customerId || deviceData.customerId.trim() === '') {
      throw new Error('Customer ID is required');
    }

    return new RegisterDeviceCompleteCommand(deviceData, tenantContext);
  }
}