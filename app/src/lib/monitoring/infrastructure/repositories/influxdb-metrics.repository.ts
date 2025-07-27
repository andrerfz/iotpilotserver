import {MetricsRepository} from '../../domain/interfaces/metrics-repository.interface';
import {Metric} from '../../domain/entities/metric.entity';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../domain/value-objects/time-range.vo';
import {MetricId} from '../../domain/value-objects/metric-id.vo';
import {MetricValue} from '../../domain/value-objects/metric-value.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import {InfluxDB, Point} from '@influxdata/influxdb-client';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';

export class InfluxDBMetricsRepository implements MetricsRepository {
    private readonly influxClient: InfluxDB;
    private readonly org: string;
    private readonly bucket: string;
    private readonly tenantValidator: TenantBoundaryValidator;

    constructor(
        influxClient: InfluxDB,
        org: string,
        bucket: string,
        tenantValidator: TenantBoundaryValidator
    ) {
        this.influxClient = influxClient;
        this.org = org;
        this.bucket = bucket;
        this.tenantValidator = tenantValidator;
    }

    async save(metric: Metric): Promise<void> {
        const writeApi = this.influxClient.getWriteApi(this.org, this.bucket, 'ns');
        
        const point = this.metricToPoint(metric);
        writeApi.writePoint(point);
        
        await writeApi.close();
    }

    async saveMany(metrics: Metric[]): Promise<void> {
        if (metrics.length === 0) return;

        // Get tenant ID from first metric
        const firstMetric = metrics[0];
        const tenantId = firstMetric.customerId;
        
        if (!tenantId) {
            throw new Error('Metric must have a tenant ID (customerId)');
        }

        // Validate tenant access
        const mockTenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(mockTenantContext, tenantId, 'SaveMetrics');

        const writeApi = this.influxClient.getWriteApi(this.org, this.bucket, 'ns');

        const points = metrics.map((metric: Metric) => {
            return this.metricToPoint(metric);
        });

        writeApi.writePoints(points);
        await writeApi.close();
    }

    async findById(id: MetricId, tenantId: CustomerId): Promise<Metric | null> {
        // Query implementation placeholder
        const query = `
            from(bucket: "${this.bucket}")
                |> range(start: -30d)
                |> filter(fn: (r) => r._measurement == "metrics" and r.id == "${id.value}" and r.tenantId == "${tenantId.value}")
                |> limit(n: 1)
        `;
        
        try {
            const result = await this.executeQuery(query);
            if (result.length === 0) {
                return null;
            }
            
            return this.rowToMetric(result[0], tenantId);
        } catch (error) {
            console.error('Error finding metric by ID:', error);
            return null;
        }
    }

    /**
     * Creates a mock tenant context for validation purposes
     * @param tenantId The tenant ID
     * @returns A TenantContext object
     */
    private createMockTenantContext(tenantId: CustomerId): TenantContext {
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        return TenantContextImpl.create(tenantId, mockUserId, mockUserRole);
    }

    async findByDeviceId(deviceId: DeviceId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindMetricsByDeviceId');
        
        const timeFilter = this.buildTimeRangeFilter(timeRange);
        
        const query = `
            from(bucket: "${this.bucket}")
                |> range(${timeFilter})
                |> filter(fn: (r) => r._measurement == "metrics" and r.deviceId == "${deviceId.value}" and r.tenantId == "${tenantId.value}")
                |> sort(columns: ["_time"], desc: true)
        `;
        
        try {
            const result = await this.executeQuery(query);
            return result.map(row => this.rowToMetric(row, tenantId));
        } catch (error) {
            console.error('Error finding metrics by device ID:', error);
            return [];
        }
    }

    async findByName(name: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindMetricsByName');
        
        const timeFilter = this.buildTimeRangeFilter(timeRange);
        
        const query = `
            from(bucket: "${this.bucket}")
                |> range(${timeFilter})
                |> filter(fn: (r) => r._measurement == "metrics" and r.name == "${name}" and r.tenantId == "${tenantId.value}")
                |> sort(columns: ["_time"], desc: true)
        `;
        
        try {
            const result = await this.executeQuery(query);
            return result.map(row => this.rowToMetric(row, tenantId));
        } catch (error) {
            console.error('Error finding metrics by name:', error);
            return [];
        }
    }

    async findByDeviceIdAndName(deviceId: DeviceId, name: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindMetricsByDeviceIdAndName');
        
        const timeFilter = this.buildTimeRangeFilter(timeRange);
        
        const query = `
            from(bucket: "${this.bucket}")
                |> range(${timeFilter})
                |> filter(fn: (r) => r._measurement == "metrics" and r.deviceId == "${deviceId.value}" and r.name == "${name}" and r.tenantId == "${tenantId.value}")
                |> sort(columns: ["_time"], desc: true)
        `;
        
        try {
            const result = await this.executeQuery(query);
            return result.map(row => this.rowToMetric(row, tenantId));
        } catch (error) {
            console.error('Error finding metrics by device ID and name:', error);
            return [];
        }
    }

    async findByTag(tagKey: string, tagValue: string, tenantId: CustomerId, timeRange?: TimeRange): Promise<Metric[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindMetricsByTag');
        
        const timeFilter = this.buildTimeRangeFilter(timeRange);
        
        const query = `
            from(bucket: "${this.bucket}")
                |> range(${timeFilter})
                |> filter(fn: (r) => r._measurement == "metrics" and r["${tagKey}"] == "${tagValue}" and r.tenantId == "${tenantId.value}")
                |> sort(columns: ["_time"], desc: true)
        `;
        
        try {
            const result = await this.executeQuery(query);
            return result.map(row => this.rowToMetric(row, tenantId));
        } catch (error) {
            console.error('Error finding metrics by tag:', error);
            return [];
        }
    }

    async findAll(tenantId: CustomerId, timeRange?: TimeRange, limit?: number): Promise<Metric[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAllMetrics');
        
        const timeFilter = this.buildTimeRangeFilter(timeRange);
        const limitClause = limit ? `|> limit(n: ${limit})` : '';
        
        const query = `
            from(bucket: "${this.bucket}")
                |> range(${timeFilter})
                |> filter(fn: (r) => r._measurement == "metrics" and r.tenantId == "${tenantId.value}")
                |> sort(columns: ["_time"], desc: true)
                ${limitClause}
        `;
        
        try {
            const result = await this.executeQuery(query);
            return result.map(row => this.rowToMetric(row, tenantId));
        } catch (error) {
            console.error('Error finding all metrics:', error);
            return [];
        }
    }

    private metricToPoint(metric: Metric): Point {
        const point = new Point('metrics')
            .tag('id', metric.id.value)
            .tag('deviceId', metric.deviceId.value)
            .tag('name', metric.name)
            .tag('unit', metric.value.unit)
            .tag('tenantId', metric.getTenantId().value)
            .floatField('value', metric.value.value)
            .timestamp(metric.timestamp);
        
        // Add all custom tags
        metric.tags.forEach((value, key) => {
            point.tag(key, value);
        });
        
        return point;
    }

    private async executeQuery(query: string): Promise<Record<string, unknown>[]> {
        const queryApi = this.influxClient.getQueryApi(this.org);
        return new Promise((resolve, reject) => {
            const rows: Record<string, unknown>[] = [];
            
            queryApi.queryRows(query, {
                next: (row, tableMeta) => {
                    const tableObject = tableMeta.toObject(row);
                    rows.push(tableObject);
                },
                error: (error) => {
                    reject(error);
                },
                complete: () => {
                    resolve(rows);
                }
            });
        });
    }

    private rowToMetric(row: Record<string, unknown>, tenantId: CustomerId): Metric {
        const id = MetricId.create(row.id as string);
        const deviceId = DeviceId.create(row.deviceId as string);
        const name = row.name as string;
        const value = MetricValue.create(parseFloat(row._value as string), (row.unit as string) || 'unknown');
        const timestamp = new Date(row._time as string);
        
        // Extract tags from row
        const tags = new Map<string, string>();
        Object.keys(row).forEach(key => {
            // Skip internal fields and known properties
            if (!key.startsWith('_') &&
                !['id', 'deviceId', 'name', 'tenantId', 'result', 'table'].includes(key)) {
                tags.set(key, String(row[key]));
            }
        });
        
        return Metric.create(
            id,
            deviceId,
            name,
            value,
            timestamp,
            tags,
            tenantId
        );
    }

    private buildTimeRangeFilter(timeRange?: TimeRange): string {
        if (!timeRange) {
            return 'start: -30d';
        }
        
        const start = `start: ${timeRange.getStartTime().toISOString()}`;
        const stop = `, stop: ${timeRange.getEndTime().toISOString()}`;
        
        return `${start}${stop}`;
    }
}