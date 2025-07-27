import {DeviceId} from '../value-objects/device-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

/**
 * Data point for a metric
 */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Repository interface for device metrics
 */
export interface MetricsRepository {
  /**
   * Get metrics for a device within a time range
   * @param deviceId The device ID
   * @param metricType The type of metric (e.g., 'cpu', 'memory', 'disk')
   * @param from Start of the time range
   * @param to End of the time range
   * @param tenantContext The tenant context
   * @returns Array of metric data points
   */
  getMetrics(
    deviceId: DeviceId,
    metricType: string,
    from: Date,
    to: Date,
    tenantContext: TenantContext
  ): Promise<MetricDataPoint[]>;

  /**
   * Get the latest metric value for a device
   * @param deviceId The device ID
   * @param metricType The type of metric (e.g., 'cpu', 'memory', 'disk')
   * @param tenantContext The tenant context
   * @returns The latest metric data point or null if no metrics exist
   */
  getLatestMetric(
    deviceId: DeviceId,
    metricType: string,
    tenantContext: TenantContext
  ): Promise<MetricDataPoint | null>;

  /**
   * Store a new metric data point
   * @param deviceId The device ID
   * @param metricType The type of metric (e.g., 'cpu', 'memory', 'disk')
   * @param value The metric value
   * @param timestamp The timestamp (defaults to now)
   * @param tenantContext The tenant context
   */
  storeMetric(
    deviceId: DeviceId,
    metricType: string,
    value: number,
    timestamp: Date | null,
    tenantContext: TenantContext
  ): Promise<void>;

  /**
   * Store multiple metric data points
   * @param metrics Array of metric data points
   * @param tenantContext The tenant context
   */
  saveMany(
    metrics: Array<{
      deviceId: string;
      metric: string;
      value: number;
      unit: string;
      timestamp: Date;
    }>,
    tenantContext?: TenantContext
  ): Promise<void>;

  /**
   * Delete metrics for a device
   * @param deviceId The device ID
   * @param tenantContext The tenant context
   */
  deleteMetricsForDevice(
    deviceId: DeviceId,
    tenantContext: TenantContext
  ): Promise<void>;
}