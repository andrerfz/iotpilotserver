import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';
import {SshCredentials} from '../value-objects/ssh-credentials.vo';
import {DeviceRepository} from '../interfaces/device-repository.interface';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceNamingPolicy} from '../policies/device-naming.policy';
import {SSHClient} from '../interfaces/ssh-client.interface';
import {Port} from '../value-objects/port.vo';
import {DeviceId} from '../value-objects/device-id.vo';

export class DeviceValidator {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly deviceNamingPolicy: DeviceNamingPolicy,
    private readonly sshClient: SSHClient
  ) {}

  async validateDeviceName(
    name: DeviceName,
    tenantContext: TenantContext,
    excludeDeviceId?: DeviceId
  ): Promise<{ isValid: boolean; message?: string }> {
    // Check if name follows naming policy
    if (!this.deviceNamingPolicy.isValidName(name)) {
      return {
        isValid: false,
        message: `Device name does not follow naming policy: ${name.getValue()}`
      };
    }

    // Check if name is already in use
    const existingDevice = await this.deviceRepository.findByName(name.getValue(), tenantContext);
    if (existingDevice && (!excludeDeviceId || !existingDevice.id.equals(excludeDeviceId))) {
      return {
        isValid: false,
        message: `Device name is already in use: ${name.getValue()}`
      };
    }

    return { isValid: true };
  }

  async validateIpAddress(
    ipAddress: IpAddress,
    tenantContext: TenantContext,
    excludeDeviceId?: DeviceId
  ): Promise<{ isValid: boolean; message?: string }> {
    // Check if IP address is valid (the value object should already validate this)
    
    // Check if IP address is already in use
    const existingDevice = await this.deviceRepository.findByIpAddress(ipAddress.getValue(), tenantContext);
    if (existingDevice && (!excludeDeviceId || !existingDevice.id.equals(excludeDeviceId))) {
      return {
        isValid: false,
        message: `IP address is already in use: ${ipAddress.getValue()}`
      };
    }

    return { isValid: true };
  }

  async validateSshCredentials(
    ipAddress: IpAddress,
    sshCredentials: SshCredentials
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      // Create a temporary device ID for testing
      const tempDeviceId = DeviceId.create('temp-validation-device');
      
      // Default SSH port
      const port = Port.create(22);
      
      // Try to connect with the credentials
      const session = await this.sshClient.connect(
        tempDeviceId,
        ipAddress,
        port,
        sshCredentials
      );
      
      // Disconnect immediately
      await this.sshClient.disconnect(session.id);
      
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      return {
        isValid: false,
        message: `Failed to connect with provided SSH credentials: ${errorMessage}`
      };
    }
  }

  async validateDeviceConnectivity(
    ipAddress: IpAddress
  ): Promise<{ isReachable: boolean; message?: string }> {
    try {
      // Create a temporary device ID for testing
      const tempDeviceId = DeviceId.create('temp-connectivity-test');
      
      // Default SSH port
      const port = Port.create(22);
      
      // Create temporary credentials (won't actually be used for connectivity test)
      const tempCredentials = SshCredentials.create('test', 'test');
      
      // Try to connect to the device (this will fail with auth error if reachable)
      await this.sshClient.connect(
        tempDeviceId,
        ipAddress,
        port,
        tempCredentials
      );
      
      // If we get here, the device is reachable (but we shouldn't, as credentials are invalid)
      return { isReachable: true };
    } catch (error) {
      // Convert the unknown error to a string message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      // Check if the error is an authentication error (which means the device is reachable)
      if (error instanceof Error && 
          (errorMessage.includes('Authentication failed') || 
           errorMessage.includes('auth fail'))) {
        return { isReachable: true };
      }
      
      // Otherwise, the device is not reachable
      return {
        isReachable: false,
        message: `Device is not reachable: ${errorMessage}`
      };
    }
  }
}