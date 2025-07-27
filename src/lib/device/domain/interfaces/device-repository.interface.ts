import {Device} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IPAddress} from '../value-objects/ip-address.vo';
import {DeviceType} from '../value-objects/device-type.vo';
import {DeviceStatus} from '../value-objects/device-status.vo';

/**
 * Repository interface for Device entity
 * Defines the contract for device data access
 */
export interface DeviceRepository {
  /**
   * Find a device by its ID
   * @param id The device ID
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the device or null if not found
   */
  findById(id: DeviceId, tenantId: string): Promise<Device | null>;

  /**
   * Find a device by its name
   * @param name The device name
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the device or null if not found
   */
  findByName(name: DeviceName, tenantId: string): Promise<Device | null>;

  /**
   * Find a device by its IP address
   * @param ipAddress The device IP address
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the device or null if not found
   */
  findByIpAddress(ipAddress: IPAddress, tenantId: string): Promise<Device | null>;

  /**
   * Find all devices for a tenant
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to an array of devices
   */
  findAll(tenantId: string): Promise<Device[]>;

  /**
   * Find devices by type
   * @param type The device type
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to an array of devices
   */
  findByType(type: DeviceType, tenantId: string): Promise<Device[]>;

  /**
   * Find devices by status
   * @param status The device status
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to an array of devices
   */
  findByStatus(status: DeviceStatus, tenantId: string): Promise<Device[]>;

  /**
   * Save a new device
   * @param device The device to save
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the saved device
   */
  save(device: Device, tenantId: string): Promise<Device>;

  /**
   * Update an existing device
   * @param device The device to update
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the updated device
   */
  update(device: Device, tenantId: string): Promise<Device>;

  /**
   * Delete a device by its ID
   * @param id The device ID
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the device was deleted, false otherwise
   */
  delete(id: DeviceId, tenantId: string): Promise<boolean>;

  /**
   * Check if a device exists by its ID
   * @param id The device ID
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the device exists, false otherwise
   */
  exists(id: DeviceId, tenantId: string): Promise<boolean>;

  /**
   * Check if a device exists by its name
   * @param name The device name
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the device exists, false otherwise
   */
  existsByName(name: DeviceName, tenantId: string): Promise<boolean>;

  /**
   * Check if a device exists by its IP address
   * @param ipAddress The device IP address
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the device exists, false otherwise
   */
  existsByIpAddress(ipAddress: IPAddress, tenantId: string): Promise<boolean>;

  /**
   * Count all devices for a tenant
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the number of devices
   */
  count(tenantId: string): Promise<number>;
}