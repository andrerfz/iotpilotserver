import {Metric} from '../entities/metric.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../value-objects/time-range.vo';
import {MetricId} from '../value-objects/metric-id.vo';

/**
 * Repository interface for metrics
 */
export interface MetricsRepository {
    /**
     * Saves a metric to the repository
     * 
     * @param metric The metric to save
     * @returns A promise that resolves when the metric is saved
     */
    save(metric: Metric): Promise<void>;
    
    /**
     * Saves multiple metrics to the repository
     * 
     * @param metrics The metrics to save
     * @returns A promise that resolves when the metrics are saved
     */
    saveMany(metrics: Metric[]): Promise<void>;
    
    /**
     * Finds a metric by its ID
     * 
     * @param id The ID of the metric to find
     * @param tenantId The tenant ID for validation
     * @returns A promise that resolves to the metric or null if not found
     */
    findById(id: MetricId, tenantId: CustomerId): Promise<Metric | null>;
    
    /**
     * Finds metrics for a specific device
     * 
     * @param deviceId The ID of the device to find metrics for
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter metrics
     * @returns A promise that resolves to an array of metrics
     */
    findByDeviceId(deviceId: DeviceId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]>;
    
    /**
     * Finds metrics by name
     * 
     * @param name The name of the metrics to find
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter metrics
     * @returns A promise that resolves to an array of metrics
     */
    findByName(name: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]>;
    
    /**
     * Finds metrics by device ID and name
     * 
     * @param deviceId The ID of the device to find metrics for
     * @param name The name of the metrics to find
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter metrics
     * @returns A promise that resolves to an array of metrics
     */
    findByDeviceIdAndName(deviceId: DeviceId, name: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]>;
    
    /**
     * Finds metrics by tag
     * 
     * @param tagKey The tag key to filter by
     * @param tagValue The tag value to filter by
     * @param tenantId The tenant ID for validation
     * @param timeRange Optional time range to filter metrics
     * @returns A promise that resolves to an array of metrics
     */
    findByTag(tagKey: string, tagValue: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]>;
    
    /**
     * Finds all metrics for a tenant
     * 
     * @param tenantId The tenant ID
     * @param timeRange Optional time range to filter metrics
     * @param limit Optional limit on the number of metrics to return
     * @returns A promise that resolves to an array of metrics
     */
    findAll(tenantId: CustomerId, timeRange?: TimeRange, limit?: number): Promise<Metric[]>;
}