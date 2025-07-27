import {Device} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceStatus} from '../value-objects/device-status.vo';
import {DeviceRepository} from '../interfaces/device-repository.interface';
import {MetricsCollector} from '../interfaces/metrics-collector.interface';
import {DeviceAccessDeniedException} from '../exceptions/device-access-denied.exception';
import {DeviceNotFoundException} from '../exceptions/device-not-found.exception';

/**
 * Policy for checking if a device is accessible
 * Encapsulates the business rule for checking device accessibility
 */
export class DeviceAccessiblePolicy {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly metricsCollector: MetricsCollector
  ) {}

  /**
   * Check if a device is accessible for operations
   * @param device The device to check
   * @param operation The operation being attempted
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceAccessDeniedException if the device is not accessible
   */
  async checkDeviceAccessible(
    device: Device,
    operation: string,
    tenantId: string
  ): Promise<void> {
    // Check if the device is online
    const isOnline = await this.metricsCollector.isDeviceOnline(device);
    
    if (!isOnline) {
      throw new DeviceAccessDeniedException(
        device.id,
        operation,
        'Device is offline'
      );
    }
    
    // Additional accessibility checks can be added here
    // For example, checking if the device is in maintenance mode
  }

  /**
   * Check if a device is accessible by its ID
   * @param deviceId The device ID to check
   * @param operation The operation being attempted
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   * @throws DeviceAccessDeniedException if the device is not accessible
   */
  async checkDeviceAccessibleById(
    deviceId: DeviceId,
    operation: string,
    tenantId: string
  ): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId, tenantId);
    
    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }
    
    await this.checkDeviceAccessible(device, operation, tenantId);
  }

  /**
   * Check if a device has a specific status
   * @param device The device to check
   * @param status The status to check for
   * @param operation The operation being attempted
   * @throws DeviceAccessDeniedException if the device does not have the required status
   */
  async checkDeviceStatus(
    device: Device,
    status: DeviceStatus,
    operation: string
  ): Promise<void> {
    // This is a simplified check - in a real implementation, you would
    // likely need to fetch the current status from the device or a repository
    
    // For demonstration purposes, we'll assume the device has a status property
    // that is an instance of DeviceStatus
    const deviceStatus = device.status;
    
    if (!deviceStatus.equals(status)) {
      throw new DeviceAccessDeniedException(
        device.id,
        operation,
        `Device is not in ${status.toString()} status`
      );
    }
  }

  /**
   * Check if a device is available for operations
   * @param device The device to check
   * @param operation The operation being attempted
   * @throws DeviceAccessDeniedException if the device is not available
   */
  async checkDeviceAvailable(
    device: Device,
    operation: string
  ): Promise<void> {
    // This is a simplified check - in a real implementation, you would
    // likely need to fetch the current status from the device or a repository
    
    // For demonstration purposes, we'll assume the device has a status property
    // that is an instance of DeviceStatus
    const deviceStatus = device.status;
    
    if (!deviceStatus.isAvailable()) {
      throw new DeviceAccessDeniedException(
        device.id,
        operation,
        `Device is not available (current status: ${deviceStatus.toString()})`
      );
    }
  }
}