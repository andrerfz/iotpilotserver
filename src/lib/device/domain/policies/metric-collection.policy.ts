import {Device} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceRepository} from '../interfaces/device-repository.interface';
import {MetricsCollector} from '../interfaces/metrics-collector.interface';
import {DeviceAccessDeniedException} from '../exceptions/device-access-denied.exception';
import {DeviceNotFoundException} from '../exceptions/device-not-found.exception';

/**
 * Policy for metric collection rules
 * Encapsulates the business rules for collecting metrics from devices
 */
export class MetricCollectionPolicy {
  // Default collection intervals in milliseconds
  private static readonly DEFAULT_COLLECTION_INTERVAL = 60000; // 1 minute
  private static readonly MIN_COLLECTION_INTERVAL = 5000; // 5 seconds
  private static readonly MAX_COLLECTION_INTERVAL = 3600000; // 1 hour

  // Default thresholds for alerts
  private static readonly DEFAULT_CPU_THRESHOLD = 90; // 90%
  private static readonly DEFAULT_MEMORY_THRESHOLD = 85; // 85%
  private static readonly DEFAULT_DISK_THRESHOLD = 90; // 90%
  private static readonly DEFAULT_TEMPERATURE_THRESHOLD = 80; // 80°C

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly metricsCollector: MetricsCollector
  ) {}

  /**
   * Check if metrics collection is allowed for a device
   * @param device The device to check
   * @throws DeviceAccessDeniedException if metrics collection is not allowed
   */
  async checkMetricsCollectionAllowed(device: Device): Promise<void> {
    // Check if the device is online
    const isOnline = await this.metricsCollector.isDeviceOnline(device);
    
    if (!isOnline) {
      throw new DeviceAccessDeniedException(
        device.id,
        'collect_metrics',
        'Device is offline'
      );
    }
    
    // Check if the device status allows metrics collection
    // For demonstration purposes, we'll assume the device has a status property
    // that is an instance of DeviceStatus
    const deviceStatus = device.status;
    
    if (deviceStatus.isInMaintenance()) {
      throw new DeviceAccessDeniedException(
        device.id,
        'collect_metrics',
        'Device is in maintenance mode'
      );
    }
    
    // Additional checks can be added here
    // For example, checking if the device has the necessary permissions
    // or if metrics collection is enabled for the device
  }

  /**
   * Check if metrics collection is allowed for a device by its ID
   * @param deviceId The device ID to check
   * @param tenantId The tenant ID (for multi-tenant support)
   * @throws DeviceNotFoundException if the device does not exist
   * @throws DeviceAccessDeniedException if metrics collection is not allowed
   */
  async checkMetricsCollectionAllowedById(
    deviceId: DeviceId,
    tenantId: string
  ): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId, tenantId);
    
    if (!device) {
      throw new DeviceNotFoundException(deviceId);
    }
    
    await this.checkMetricsCollectionAllowed(device);
  }

  /**
   * Get the appropriate collection interval for a device
   * @param device The device to get the collection interval for
   * @returns The collection interval in milliseconds
   */
  getCollectionInterval(device: Device): number {
    // This is a simplified implementation - in a real application,
    // you might want to get the collection interval from the device configuration
    // or from a tenant-specific setting
    
    // For demonstration purposes, we'll return the default collection interval
    return MetricCollectionPolicy.DEFAULT_COLLECTION_INTERVAL;
  }

  /**
   * Check if a metric value exceeds the threshold
   * @param metricName The name of the metric
   * @param metricValue The value of the metric
   * @param device The device the metric is for
   * @returns True if the metric exceeds the threshold, false otherwise
   */
  isMetricExceedingThreshold(
    metricName: string,
    metricValue: number,
    device: Device
  ): boolean {
    // Get the appropriate threshold for the metric
    const threshold = this.getMetricThreshold(metricName, device);
    
    // Check if the metric exceeds the threshold
    return metricValue > threshold;
  }

  /**
   * Get the threshold for a metric
   * @param metricName The name of the metric
   * @param device The device the metric is for
   * @returns The threshold value
   */
  private getMetricThreshold(metricName: string, device: Device): number {
    // This is a simplified implementation - in a real application,
    // you might want to get the threshold from the device configuration
    // or from a tenant-specific setting
    
    // For demonstration purposes, we'll return default thresholds based on the metric name
    switch (metricName.toLowerCase()) {
      case 'cpu':
      case 'cpu_usage':
        return MetricCollectionPolicy.DEFAULT_CPU_THRESHOLD;
      
      case 'memory':
      case 'memory_usage':
        return MetricCollectionPolicy.DEFAULT_MEMORY_THRESHOLD;
      
      case 'disk':
      case 'disk_usage':
        return MetricCollectionPolicy.DEFAULT_DISK_THRESHOLD;
      
      case 'temperature':
        return MetricCollectionPolicy.DEFAULT_TEMPERATURE_THRESHOLD;
      
      default:
        // For unknown metrics, return a high threshold to avoid false positives
        return 95;
    }
  }

  /**
   * Determine if a metric should trigger an alert
   * @param metricName The name of the metric
   * @param metricValue The value of the metric
   * @param device The device the metric is for
   * @returns True if the metric should trigger an alert, false otherwise
   */
  shouldTriggerAlert(
    metricName: string,
    metricValue: number,
    device: Device
  ): boolean {
    // Check if the metric exceeds the threshold
    const exceedsThreshold = this.isMetricExceedingThreshold(metricName, metricValue, device);
    
    // Additional logic can be added here
    // For example, checking if the metric has been exceeding the threshold for a certain period
    // or if alerts are enabled for this metric
    
    return exceedsThreshold;
  }
}