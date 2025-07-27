import {DeviceName} from '@/lib/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@/lib/device/domain/value-objects/ip-address.vo';
import {SshCredentials} from '@/lib/device/domain/value-objects/ssh-credentials.vo';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {DeviceNamingPolicy} from '@/lib/device/domain/policies/device-naming.policy';
import {InvalidDeviceDataException} from '@/lib/device/domain/exceptions/invalid-device-data.exception';

/**
 * Service for validating device data
 */
export class DeviceValidator {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly deviceNamingPolicy: DeviceNamingPolicy
  ) {}

  /**
   * Validate a device name
   * @param name The device name
   * @param tenantContext The tenant context
   * @param excludeDeviceId Optional device ID to exclude from uniqueness check
   * @throws InvalidDeviceDataException if the name is invalid or not unique
   */
  async validateName(
    name: DeviceName,
    tenantContext: TenantContext,
    excludeDeviceId?: string
  ): Promise<void> {
    // Validate device name using the naming policy
    try {
      await this.deviceNamingPolicy.validate(name, excludeDeviceId);
    } catch (error) {
      if (error instanceof InvalidDeviceDataException) {
        throw error;
      }
      throw new InvalidDeviceDataException(`Invalid device name: ${name.getValue()}`);
    }

    // Check if device with same name already exists
    const existingDeviceWithName = await this.deviceRepository.findByName(name.getValue(), tenantContext);
    if (existingDeviceWithName && (!excludeDeviceId || existingDeviceWithName.id.getValue() !== excludeDeviceId)) {
      throw new InvalidDeviceDataException(`Device with name ${name.getValue()} already exists`);
    }
  }

  /**
   * Validate a device IP address
   * @param ipAddress The device IP address
   * @param tenantContext The tenant context
   * @param excludeDeviceId Optional device ID to exclude from uniqueness check
   * @throws InvalidDeviceDataException if the IP address is invalid or not unique
   */
  async validateIpAddress(
    ipAddress: IpAddress,
    tenantContext: TenantContext,
    excludeDeviceId?: string
  ): Promise<void> {
    // Check if device with same IP address already exists
    const existingDeviceWithIp = await this.deviceRepository.findByIpAddress(ipAddress.getValue(), tenantContext);
    if (existingDeviceWithIp && (!excludeDeviceId || existingDeviceWithIp.id.getValue() !== excludeDeviceId)) {
      throw new InvalidDeviceDataException(`Device with IP address ${ipAddress.getValue()} already exists`);
    }
  }

  /**
   * Validate SSH credentials
   * @param sshCredentials The SSH credentials
   * @throws InvalidDeviceDataException if the credentials are invalid
   */
  validateSshCredentials(sshCredentials: SshCredentials): void {
    // Validate username
    if (!sshCredentials.username || sshCredentials.username.trim() === '') {
      throw new InvalidDeviceDataException('SSH username cannot be empty');
    }

    // Validate port
    const port = sshCredentials.port;
    if (port <= 0 || port > 65535) {
      throw new InvalidDeviceDataException(`Invalid SSH port: ${port}`);
    }

    // Note: Password can be empty in some cases (e.g., key-based authentication)
  }

  /**
   * Validate all device data
   * @param name The device name
   * @param ipAddress The device IP address
   * @param sshCredentials The SSH credentials
   * @param tenantContext The tenant context
   * @param excludeDeviceId Optional device ID to exclude from uniqueness checks
   * @throws InvalidDeviceDataException if any data is invalid
   */
  async validateDeviceData(
    name: DeviceName,
    ipAddress: IpAddress,
    sshCredentials: SshCredentials,
    tenantContext: TenantContext,
    excludeDeviceId?: string
  ): Promise<void> {
    // Validate name
    await this.validateName(name, tenantContext, excludeDeviceId);

    // Validate IP address
    await this.validateIpAddress(ipAddress, tenantContext, excludeDeviceId);

    // Validate SSH credentials
    this.validateSshCredentials(sshCredentials);
  }
}