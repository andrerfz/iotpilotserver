import {DeviceName} from '../value-objects/device-name.vo';
import {DeviceRepository} from '../interfaces/device-repository.interface';
import {InvalidDeviceDataException} from '../exceptions/invalid-device-data.exception';

/**
 * Policy for device naming rules
 * Encapsulates the business rules for device names
 */
export class DeviceNamingPolicy {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  /**
   * Validate a device name against naming rules
   * @param name The device name to validate
   * @throws InvalidDeviceDataException if the name is invalid
   */
  validateDeviceName(name: DeviceName): void {
    const nameStr = name.toString();
    
    // Check for reserved prefixes
    const reservedPrefixes = ['system_', 'admin_', 'reserved_'];
    for (const prefix of reservedPrefixes) {
      if (nameStr.toLowerCase().startsWith(prefix)) {
        throw new InvalidDeviceDataException(
          'name',
          `Device name cannot start with reserved prefix '${prefix}'`
        );
      }
    }
    
    // Check for disallowed characters
    const disallowedCharsRegex = /[<>:"\/\\|?*]/;
    if (disallowedCharsRegex.test(nameStr)) {
      throw new InvalidDeviceDataException(
        'name',
        'Device name contains disallowed characters (< > : " / \\ | ? *)'
      );
    }
    
    // Check for naming conventions (e.g., no spaces at beginning/end)
    if (nameStr !== nameStr.trim()) {
      throw new InvalidDeviceDataException(
        'name',
        'Device name cannot have leading or trailing spaces'
      );
    }
  }

  /**
   * Check if a device name is unique within a tenant
   * @param name The device name to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @param excludeDeviceId Optional device ID to exclude from the check (for updates)
   * @throws InvalidDeviceDataException if the name is not unique
   */
  async checkDeviceNameUnique(
    name: DeviceName,
    tenantId: string,
    excludeDeviceId?: string
  ): Promise<void> {
    const existingDevice = await this.deviceRepository.findByName(name, tenantId);
    
    if (existingDevice && (!excludeDeviceId || existingDevice.id.toString() !== excludeDeviceId)) {
      throw new InvalidDeviceDataException(
        'name',
        `Device name '${name.toString()}' is already in use`
      );
    }
  }

  /**
   * Generate a unique device name based on a base name
   * @param baseName The base name to use
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns A unique device name
   */
  async generateUniqueDeviceName(
    baseName: string,
    tenantId: string
  ): Promise<DeviceName> {
    let counter = 0;
    let uniqueName = baseName;
    let deviceName = DeviceName.create(uniqueName);
    
    // Try to find a unique name by appending a counter
    while (await this.deviceRepository.existsByName(deviceName, tenantId)) {
      counter++;
      uniqueName = `${baseName}-${counter}`;
      deviceName = DeviceName.create(uniqueName);
    }
    
    return deviceName;
  }

  /**
   * Normalize a device name according to naming conventions
   * @param name The device name to normalize
   * @returns A normalized device name
   */
  normalizeDeviceName(name: string): DeviceName {
    // Trim spaces
    let normalized = name.trim();
    
    // Replace multiple spaces with a single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Replace disallowed characters with underscores
    normalized = normalized.replace(/[<>:"\/\\|?*]/g, '_');
    
    // Remove any reserved prefixes
    const reservedPrefixes = ['system_', 'admin_', 'reserved_'];
    for (const prefix of reservedPrefixes) {
      if (normalized.toLowerCase().startsWith(prefix)) {
        normalized = normalized.substring(prefix.length);
      }
    }
    
    // Ensure the name is not empty after normalization
    if (!normalized) {
      normalized = 'device';
    }
    
    return DeviceName.create(normalized);
  }
}