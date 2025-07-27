import {Device} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceType} from '../value-objects/device-type.vo';
import {DeviceRepository} from '../interfaces/device-repository.interface';
import {DeviceAccessDeniedException} from '../exceptions/device-access-denied.exception';
import {DeviceNotFoundException} from '../exceptions/device-not-found.exception';
import {SSHConnectionFailedException} from '../exceptions/ssh-connection-failed.exception';

/**
 * Policy for checking if SSH operations are allowed on a device
 * Encapsulates the business rule for SSH access control
 */
export class SSHAllowedPolicy {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  /**
   * Check if SSH operations are allowed on a device
   * @param device The device to check
   * @param operation The SSH operation being attempted
   * @throws DeviceAccessDeniedException if SSH operations are not allowed
   */
  async checkSSHAllowed(
    device: Device,
    operation: string
  ): Promise<void> {
    // Check if the device type supports SSH
    if (!this.isSSHSupportedForDeviceType(device.type)) {
      throw new DeviceAccessDeniedException(
        device.id,
        operation,
        `SSH operations are not supported for device type ${device.type.toString()}`
      );
    }

    // Additional SSH permission checks can be added here
    // For example, checking if the user has permission to perform SSH operations
    // or if SSH is enabled for the device
  }

  /**
   * Check if SSH operations are allowed on a device by its ID
   * @param deviceId The device ID to check
   * @param operation The SSH operation being attempted
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   * @throws DeviceAccessDeniedException if SSH operations are not allowed
   */
  async checkSSHAllowedById(
    deviceId: DeviceId,
    operation: string,
    tenantId: string
  ): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId, tenantId);
    
    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }
    
    await this.checkSSHAllowed(device, operation);
  }

  /**
   * Check if a device type supports SSH operations
   * @param deviceType The device type to check
   * @returns True if the device type supports SSH, false otherwise
   */
  private isSSHSupportedForDeviceType(deviceType: DeviceType): boolean {
    return deviceType.supportsSSH();
  }

  /**
   * Check if a device has valid SSH credentials
   * @param device The device to check
   * @param operation The SSH operation being attempted
   * @throws SSHConnectionFailedException if the device does not have valid SSH credentials
   */
  async checkSSHCredentialsValid(
    device: Device,
    operation: string
  ): Promise<void> {
    // This is a simplified check - in a real implementation, you would
    // likely need to validate the credentials against the device
    
    // For demonstration purposes, we'll assume the device has an sshCredentials property
    // that is an instance of SSHCredentials
    const sshCredentials = device.sshCredentials;
    
    if (!sshCredentials) {
      throw new SSHConnectionFailedException(
        device.id,
        'No SSH credentials available'
      );
    }
    
    // Additional credential validation can be added here
  }

  /**
   * Check if an SSH port is valid and allowed
   * @param port The port number to check
   * @param operation The SSH operation being attempted
   * @throws DeviceAccessDeniedException if the port is not allowed
   */
  async checkSSHPortAllowed(
    port: number,
    operation: string
  ): Promise<void> {
    // Check if the port is within a valid range
    if (port < 1 || port > 65535) {
      throw new DeviceAccessDeniedException(
        'unknown',
        operation,
        `Invalid SSH port: ${port}`
      );
    }
    
    // Check if the port is allowed for SSH
    // For example, you might want to restrict SSH to certain ports
    const allowedPorts = [22, 2222, 22222]; // Example allowed ports
    
    if (!allowedPorts.includes(port)) {
      throw new DeviceAccessDeniedException(
        'unknown',
        operation,
        `SSH port ${port} is not allowed. Allowed ports: ${allowedPorts.join(', ')}`
      );
    }
  }
}