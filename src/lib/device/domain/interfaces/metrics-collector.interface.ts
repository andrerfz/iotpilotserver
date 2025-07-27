import {Device} from '../entities/device.entity';
import {DeviceMetrics} from '../entities/device-metrics.entity';
import {IPAddress} from '../value-objects/ip-address.vo';
import {DeviceId} from '../value-objects/device-id.vo';

/**
 * Interface for metrics collection operations
 * Defines the contract for collecting metrics from devices
 */
export interface MetricsCollector {
  /**
   * Collect all metrics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to the collected metrics
   */
  collectMetrics(device: Device): Promise<DeviceMetrics>;

  /**
   * Collect all metrics from a device by its ID
   * @param deviceId The ID of the device to collect metrics from
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to the collected metrics
   */
  collectMetricsById(deviceId: DeviceId, tenantId: string): Promise<DeviceMetrics>;

  /**
   * Collect all metrics from a device by its IP address
   * @param ipAddress The IP address of the device to collect metrics from
   * @returns Promise resolving to the collected metrics
   */
  collectMetricsByIp(ipAddress: IPAddress): Promise<DeviceMetrics>;

  /**
   * Collect CPU usage metrics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to the CPU usage percentage (0-100)
   */
  collectCpuUsage(device: Device): Promise<number>;

  /**
   * Collect memory usage metrics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to the memory usage percentage (0-100)
   */
  collectMemoryUsage(device: Device): Promise<number>;

  /**
   * Collect disk usage metrics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to a map of disk paths to usage percentages
   */
  collectDiskUsage(device: Device): Promise<Record<string, number>>;

  /**
   * Collect network statistics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to a map of network interfaces to statistics
   */
  collectNetworkStats(device: Device): Promise<Record<string, string>>;

  /**
   * Collect temperature metrics from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to the temperature in Celsius
   */
  collectTemperature(device: Device): Promise<number>;

  /**
   * Collect uptime from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to the uptime in seconds
   */
  collectUptime(device: Device): Promise<number>;

  /**
   * Collect running processes from a device
   * @param device The device to collect metrics from
   * @returns Promise resolving to an array of process information
   */
  collectProcesses(device: Device): Promise<Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
  }>>;

  /**
   * Check if a device is online and reachable
   * @param device The device to check
   * @returns Promise resolving to true if the device is online
   */
  isDeviceOnline(device: Device): Promise<boolean>;

  /**
   * Check if a device is online and reachable by its IP address
   * @param ipAddress The IP address of the device to check
   * @returns Promise resolving to true if the device is online
   */
  isDeviceOnlineByIp(ipAddress: IPAddress): Promise<boolean>;
}