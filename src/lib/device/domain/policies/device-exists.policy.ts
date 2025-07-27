import {DeviceRepository} from '../interfaces/device-repository.interface';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IPAddress} from '../value-objects/ip-address.vo';
import {DeviceNotFoundException} from '../exceptions/device-not-found.exception';

/**
 * Policy for checking if a device exists
 * Encapsulates the business rule for checking device existence
 */
export class DeviceExistsPolicy {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  /**
   * Check if a device exists by its ID
   * @param deviceId The device ID to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   */
  async checkDeviceExists(deviceId: DeviceId, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.exists(deviceId, tenantId);
    
    if (!exists) {
      throw new DeviceNotFoundException(deviceId);
    }
  }

  /**
   * Check if a device exists by its name
   * @param deviceName The device name to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   */
  async checkDeviceExistsByName(deviceName: DeviceName, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.existsByName(deviceName, tenantId);
    
    if (!exists) {
      throw new DeviceNotFoundException(`Device with name '${deviceName.toString()}' not found`);
    }
  }

  /**
   * Check if a device exists by its IP address
   * @param ipAddress The IP address to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   */
  async checkDeviceExistsByIpAddress(ipAddress: IPAddress, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.existsByIpAddress(ipAddress, tenantId);
    
    if (!exists) {
      throw new DeviceNotFoundException(`Device with IP address '${ipAddress.toString()}' not found`);
    }
  }

  /**
   * Check if a device does not exist by its ID (for creation operations)
   * @param deviceId The device ID to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceAlreadyExistsException if the device already exists
   */
  async checkDeviceDoesNotExist(deviceId: DeviceId, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.exists(deviceId, tenantId);
    
    if (exists) {
      throw new Error(`Device with ID '${deviceId.toString()}' already exists`);
    }
  }

  /**
   * Check if a device does not exist by its name (for creation operations)
   * @param deviceName The device name to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceAlreadyExistsException if the device already exists
   */
  async checkDeviceDoesNotExistByName(deviceName: DeviceName, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.existsByName(deviceName, tenantId);
    
    if (exists) {
      throw new Error(`Device with name '${deviceName.toString()}' already exists`);
    }
  }

  /**
   * Check if a device does not exist by its IP address (for creation operations)
   * @param ipAddress The IP address to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceAlreadyExistsException if the device already exists
   */
  async checkDeviceDoesNotExistByIpAddress(ipAddress: IPAddress, tenantId: string): Promise<void> {
    const exists = await this.deviceRepository.existsByIpAddress(ipAddress, tenantId);
    
    if (exists) {
      throw new Error(`Device with IP address '${ipAddress.toString()}' already exists`);
    }
  }
}