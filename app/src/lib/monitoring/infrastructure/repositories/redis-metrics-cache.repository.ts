import {MetricsCacheRepository} from '../../domain/interfaces/metrics-cache-repository.interface';
import {Metric} from '../../domain/entities/metric.entity';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../domain/value-objects/time-range.vo';
import {MetricId} from '../../domain/value-objects/metric-id.vo';
import {MetricValue} from '../../domain/value-objects/metric-value.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import Redis from 'ioredis';

export class RedisMetricsCacheRepository implements MetricsCacheRepository {
    private readonly DEFAULT_TTL = 86400; // 24 hours in seconds
    private readonly METRICS_PREFIX = 'metrics:';
    private readonly DEVICE_METRICS_PREFIX = 'device-metrics:';
    private readonly TENANT_METRICS_PREFIX = 'tenant-metrics:';

    constructor(
        private readonly redisClient: Redis,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async cacheMetric(metric: Metric, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {

        const metricKey = this.getMetricKey(metric.id.value);
        const deviceMetricsKey = this.getDeviceMetricsKey(metric.deviceId.value, metric.getTenantId().value);
        const deviceMetricNameKey = this.getDeviceMetricNameKey(metric.deviceId.value, metric.name, metric.getTenantId().value);
        const tenantMetricsKey = this.getTenantMetricsKey(metric.getTenantId().value);

        const metricData = this.serializeMetric(metric);

        // Use a Redis transaction to ensure atomicity
        const multi = (this.redisClient as any).multi();

        // Store the metric data
        multi.set(metricKey, metricData);
        multi.expire(metricKey, ttlSeconds);

        // Add to device metrics sorted set (score is timestamp for ordering)
        multi.zadd(deviceMetricsKey, metric.timestamp.getTime(), metric.id.value);
        multi.expire(deviceMetricsKey, ttlSeconds);

        // Add to device metric name sorted set
        multi.zadd(deviceMetricNameKey, metric.timestamp.getTime(), metric.id.value);
        multi.expire(deviceMetricNameKey, ttlSeconds);

        // Add to tenant metrics sorted set
        multi.zadd(tenantMetricsKey, metric.timestamp.getTime(), metric.id.value);
        multi.expire(tenantMetricsKey, ttlSeconds);

        // Execute the transaction
        await multi.exec();
    }

    async cacheMetrics(metrics: Metric[], ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        if (metrics.length === 0) {
            return;
        }

        // Group metrics by tenant for validation
        const metricsByTenant = new Map<string, Metric[]>();
        
        for (const metric of metrics) {
            const tenantId = metric.getTenantId().value;
            if (!metricsByTenant.has(tenantId)) {
                metricsByTenant.set(tenantId, []);
            }
            metricsByTenant.get(tenantId)!.push(metric);
        }


        // Use a Redis transaction to ensure atomicity
        const multi = (this.redisClient as any).multi();

        for (const metric of metrics) {
            const metricKey = this.getMetricKey(metric.id.value);
            const deviceMetricsKey = this.getDeviceMetricsKey(metric.deviceId.value, metric.getTenantId().value);
            const deviceMetricNameKey = this.getDeviceMetricNameKey(metric.deviceId.value, metric.name, metric.getTenantId().value);
            const tenantMetricsKey = this.getTenantMetricsKey(metric.getTenantId().value);

            const metricData = this.serializeMetric(metric);

            // Store the metric data
            multi.set(metricKey, metricData);
            multi.expire(metricKey, ttlSeconds);

            // Add to device metrics sorted set
            multi.zadd(deviceMetricsKey, metric.timestamp.getTime(), metric.id.value);
            multi.expire(deviceMetricsKey, ttlSeconds);

            // Add to device metric name sorted set
            multi.zadd(deviceMetricNameKey, metric.timestamp.getTime(), metric.id.value);
            multi.expire(deviceMetricNameKey, ttlSeconds);

            // Add to tenant metrics sorted set
            multi.zadd(tenantMetricsKey, metric.timestamp.getTime(), metric.id.value);
            multi.expire(tenantMetricsKey, ttlSeconds);
        }

        // Execute the transaction
        await multi.exec();
    }

    async getLatestMetricsForDevice(deviceId: DeviceId, tenantId: CustomerId, limit: number = 100): Promise<Metric[]> {

        const deviceMetricsKey = this.getDeviceMetricsKey(deviceId.value, tenantId.value);

        // Get the latest metric IDs from the sorted set (highest scores first)
        const metricIds = await (this.redisClient as any).zrevrange(deviceMetricsKey, 0, limit - 1);

        if (metricIds.length === 0) {
            return [];
        }

        // Get the metric data for each ID
        return await this.getMetricsByIds(metricIds, tenantId);
    }

    async getLatestMetricsByName(deviceId: DeviceId, metricName: string, tenantId: CustomerId, limit: number = 100): Promise<Metric[]> {

        const deviceMetricNameKey = this.getDeviceMetricNameKey(deviceId.value, metricName, tenantId.value);

        // Get the latest metric IDs from the sorted set (highest scores first)
        const metricIds = await (this.redisClient as any).zrevrange(deviceMetricNameKey, 0, limit - 1);

        if (metricIds.length === 0) {
            return [];
        }

        // Get the metric data for each ID
        return await this.getMetricsByIds(metricIds, tenantId);
    }

    async getLatestMetricsForAllDevices(tenantId: CustomerId, limit: number = 10): Promise<Map<string, Metric[]>> {

        const tenantMetricsKey = this.getTenantMetricsKey(tenantId.value);

        // Get all metric IDs for the tenant
        const metricIds = await (this.redisClient as any).zrevrange(tenantMetricsKey, 0, -1);

        if (metricIds.length === 0) {
            return new Map();
        }

        // Get the metric data for each ID
        const metrics = await this.getMetricsByIds(metricIds, tenantId);

        // Group metrics by device ID
        const metricsByDevice = new Map<string, Metric[]>();

        for (const metric of metrics) {
            const deviceId = metric.deviceId.value;
            
            if (!metricsByDevice.has(deviceId)) {
                metricsByDevice.set(deviceId, []);
            }
            
            const deviceMetrics = metricsByDevice.get(deviceId)!;
            
            // Only keep the latest 'limit' metrics per device
            if (deviceMetrics.length < limit) {
                deviceMetrics.push(metric);
            }
        }

        return metricsByDevice;
    }

    async invalidateMetricsForDevice(deviceId: DeviceId, tenantId: CustomerId): Promise<void> {

        const deviceMetricsKey = this.getDeviceMetricsKey(deviceId.value, tenantId.value);

        // Get all metric IDs for the device
        const metricIds = await (this.redisClient as any).zrange(deviceMetricsKey, 0, -1);

        if (metricIds.length === 0) {
            return;
        }

        // Use a Redis transaction to ensure atomicity
        const multi = (this.redisClient as any).multi();

        // Delete each metric
        for (const metricId of metricIds) {
            multi.del(this.getMetricKey(metricId));
        }

        // Delete the device metrics key
        multi.del(deviceMetricsKey);

        // Delete all device metric name keys (pattern matching)
        const deviceMetricNamePattern = this.getDeviceMetricNamePattern(deviceId.value, tenantId.value);
        const deviceMetricNameKeys = await (this.redisClient as any).keys(deviceMetricNamePattern);
        
        for (const key of deviceMetricNameKeys) {
            multi.del(key);
        }

        // Execute the transaction
        await multi.exec();
    }

    async invalidateMetricsByName(deviceId: DeviceId, metricName: string, tenantId: CustomerId): Promise<void> {

        const deviceMetricNameKey = this.getDeviceMetricNameKey(deviceId.value, metricName, tenantId.value);

        // Get all metric IDs for the device and metric name
        const metricIds = await (this.redisClient as any).zrange(deviceMetricNameKey, 0, -1);

        if (metricIds.length === 0) {
            return;
        }

        // Use a Redis transaction to ensure atomicity
        const multi = (this.redisClient as any).multi();

        // Delete each metric
        for (const metricId of metricIds) {
            multi.del(this.getMetricKey(metricId));
            
            // Remove from device metrics sorted set
            const deviceMetricsKey = this.getDeviceMetricsKey(deviceId.value, tenantId.value);
            multi.zrem(deviceMetricsKey, metricId);
            
            // Remove from tenant metrics sorted set
            const tenantMetricsKey = this.getTenantMetricsKey(tenantId.value);
            multi.zrem(tenantMetricsKey, metricId);
        }

        // Delete the device metric name key
        multi.del(deviceMetricNameKey);

        // Execute the transaction
        await multi.exec();
    }

    async invalidateAllMetrics(tenantId: CustomerId): Promise<void> {

        const tenantMetricsKey = this.getTenantMetricsKey(tenantId.value);

        // Get all metric IDs for the tenant
        const metricIds = await (this.redisClient as any).zrange(tenantMetricsKey, 0, -1);

        // Use a Redis transaction to ensure atomicity
        const multi = (this.redisClient as any).multi();

        // Delete each metric
        for (const metricId of metricIds) {
            multi.del(this.getMetricKey(metricId));
        }

        // Delete all device metrics keys (pattern matching)
        const deviceMetricsPattern = this.getDeviceMetricsPattern(tenantId.value);
        const deviceMetricsKeys = await (this.redisClient as any).keys(deviceMetricsPattern);
        
        for (const key of deviceMetricsKeys) {
            multi.del(key);
        }

        // Delete all device metric name keys (pattern matching)
        const deviceMetricNamePattern = this.getDeviceMetricNamePatternForTenant(tenantId.value);
        const deviceMetricNameKeys = await (this.redisClient as any).keys(deviceMetricNamePattern);
        
        for (const key of deviceMetricNameKeys) {
            multi.del(key);
        }

        // Delete the tenant metrics key
        multi.del(tenantMetricsKey);

        // Execute the transaction
        await multi.exec();
    }

    async getCachedTimeRange(deviceId: DeviceId, tenantId: CustomerId): Promise<TimeRange | null> {

        const deviceMetricsKey = this.getDeviceMetricsKey(deviceId.value, tenantId.value);

        // Get the oldest and newest metrics (by score)
        const oldestMetrics = await (this.redisClient as any).zrange(deviceMetricsKey, 0, 0, 'WITHSCORES');
        const newestMetrics = await (this.redisClient as any).zrevrange(deviceMetricsKey, 0, 0, 'WITHSCORES');

        if (oldestMetrics.length === 0 || newestMetrics.length === 0) {
            return null;
        }

        // Extract timestamps from scores
        const oldestTimestamp = parseInt(oldestMetrics[1]);
        const newestTimestamp = parseInt(newestMetrics[1]);

        return TimeRange.create(
            new Date(oldestTimestamp),
            new Date(newestTimestamp)
        );
    }

    private async getMetricsByIds(metricIds: string[], tenantId: CustomerId): Promise<Metric[]> {
        if (metricIds.length === 0) {
            return [];
        }

        // Get the metric data for each ID
        const metricKeys = metricIds.map(id => this.getMetricKey(id));
        const metricDataArray = await (this.redisClient as any).mget(...metricKeys);

        // Parse the metric data and filter out any null values
        const metrics: Metric[] = [];

        for (const metricData of metricDataArray) {
            if (metricData) {
                try {
                    const metric = this.deserializeMetric(metricData, tenantId);
                    metrics.push(metric);
                } catch (error) {
                    console.error('Error deserializing metric:', error);
                }
            }
        }

        return metrics;
    }

    private serializeMetric(metric: Metric): string {
        const metricData = {
            id: metric.id.value,
            deviceId: metric.deviceId.value,
            name: metric.name,
            value: metric.value.value,
            unit: metric.value.unit,
            timestamp: metric.timestamp.getTime(),
            tags: Array.from(metric.tags.entries()),
            tenantId: metric.getTenantId().value
        };

        return JSON.stringify(metricData);
    }

    private deserializeMetric(metricData: string, tenantId: CustomerId): Metric {
        const data = JSON.parse(metricData);

        // Validate that the metric belongs to the tenant
        if (data.tenantId !== tenantId.value) {
            throw new Error(`Tenant boundary violation: Metric belongs to tenant ${data.tenantId}, but accessed by tenant ${tenantId.value}`);
        }

        const tags = new Map<string, string>();
        for (const [key, value] of data.tags) {
            tags.set(key, value);
        }

        return Metric.create(
            MetricId.create(data.id),
            DeviceId.create(data.deviceId),
            data.name,
            MetricValue.create(data.value, data.unit || 'unknown'),
            new Date(data.timestamp),
            tags,
            CustomerId.create(data.tenantId)
        );
    }

    private getMetricKey(metricId: string): string {
        return `${this.METRICS_PREFIX}${metricId}`;
    }

    private getDeviceMetricsKey(deviceId: string, tenantId: string): string {
        return `${this.DEVICE_METRICS_PREFIX}${tenantId}:${deviceId}`;
    }

    private getDeviceMetricNameKey(deviceId: string, metricName: string, tenantId: string): string {
        return `${this.DEVICE_METRICS_PREFIX}${tenantId}:${deviceId}:${metricName}`;
    }

    private getTenantMetricsKey(tenantId: string): string {
        return `${this.TENANT_METRICS_PREFIX}${tenantId}`;
    }

    private getDeviceMetricsPattern(tenantId: string): string {
        return `${this.DEVICE_METRICS_PREFIX}${tenantId}:*`;
    }

    private getDeviceMetricNamePattern(deviceId: string, tenantId: string): string {
        return `${this.DEVICE_METRICS_PREFIX}${tenantId}:${deviceId}:*`;
    }

    private getDeviceMetricNamePatternForTenant(tenantId: string): string {
        return `${this.DEVICE_METRICS_PREFIX}${tenantId}:*:*`;
    }
}