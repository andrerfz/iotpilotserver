import {Metric} from '../entities/metric.entity';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../value-objects/time-range.vo';

/**
 * Repository interface for caching metrics
 */
export interface MetricsCacheRepository {
    /**
     * Caches a metric
     * 
     * @param metric The metric to cache
     * @param ttlSeconds Optional time-to-live in seconds
     * @returns A promise that resolves when the metric is cached
     */
    cacheMetric(metric: Metric, ttlSeconds?: number): Promise<void>;
    
    /**
     * Caches multiple metrics
     * 
     * @param metrics The metrics to cache
     * @param ttlSeconds Optional time-to-live in seconds
     * @returns A promise that resolves when the metrics are cached
     */
    cacheMetrics(metrics: Metric[], ttlSeconds?: number): Promise<void>;
    
    /**
     * Gets the latest metrics for a device
     * 
     * @param deviceId The ID of the device to get metrics for
     * @param tenantId The tenant ID for validation
     * @param limit Optional limit on the number of metrics to return
     * @returns A promise that resolves to an array of metrics
     */
    getLatestMetricsForDevice(deviceId: DeviceId, tenantId: CustomerId, limit?: number): Promise<Metric[]>;
    
    /**
     * Gets the latest metrics for a device by metric name
     * 
     * @param deviceId The ID of the device to get metrics for
     * @param metricName The name of the metrics to get
     * @param tenantId The tenant ID for validation
     * @param limit Optional limit on the number of metrics to return
     * @returns A promise that resolves to an array of metrics
     */
    getLatestMetricsByName(deviceId: DeviceId, metricName: string, tenantId: CustomerId, limit?: number): Promise<Metric[]>;
    
    /**
     * Gets the latest metrics for all devices
     * 
     * @param tenantId The tenant ID for validation
     * @param limit Optional limit on the number of metrics to return per device
     * @returns A promise that resolves to a map of device IDs to arrays of metrics
     */
    getLatestMetricsForAllDevices(tenantId: CustomerId, limit?: number): Promise<Map<string, Metric[]>>;
    
    /**
     * Invalidates cached metrics for a device
     * 
     * @param deviceId The ID of the device to invalidate metrics for
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves when the metrics are invalidated
     */
    invalidateMetricsForDevice(deviceId: DeviceId, tenantId: CustomerId): Promise<void>;
    
    /**
     * Invalidates cached metrics for a device by metric name
     * 
     * @param deviceId The ID of the device to invalidate metrics for
     * @param metricName The name of the metrics to invalidate
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves when the metrics are invalidated
     */
    invalidateMetricsByName(deviceId: DeviceId, metricName: string, tenantId: CustomerId): Promise<void>;
    
    /**
     * Invalidates all cached metrics for a tenant
     * 
     * @param tenantId The tenant ID
     * @returns A promise that resolves when the metrics are invalidated
     */
    invalidateAllMetrics(tenantId: CustomerId): Promise<void>;
    
    /**
     * Gets the time range of cached metrics for a device
     * 
     * @param deviceId The ID of the device to get the time range for
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to the time range or null if no metrics are cached
     */
    getCachedTimeRange(deviceId: DeviceId, tenantId: CustomerId): Promise<TimeRange | null>;
}