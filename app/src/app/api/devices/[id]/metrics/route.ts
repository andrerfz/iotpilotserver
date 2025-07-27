// app/src/app/api/devices/[id]/metrics/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/devices/:id/metrics - Get device metrics using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];
        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const metric = searchParams.get('metric') || 'all'; // 'all', 'cpu_usage', 'memory_usage', etc.
        const period = searchParams.get('period') || '24h'; // '1h', '24h', '7d', '30d'
        const resolution = searchParams.get('resolution') || 'auto'; // 'auto', 'raw', 'minute', 'hour', 'day'

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '1h':
                startDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default: // 24h is default
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Import GetDeviceMetrics query here to avoid circular imports
        const { GetDeviceMetricsQuery } = await import('@/lib/device/application/queries/get-device-metrics/get-device-metrics.query');

        // Create and execute GetDeviceMetrics query
        const getDeviceMetricsQuery = GetDeviceMetricsQuery.create(
            deviceId,
            {
                from: startDate,
                to: now
            },
            metric === 'all' ? ['cpu', 'memory', 'disk', 'network'] : metric.split(','),
            request.user?.customerId || undefined,
            tenantContext
        );

        const metricsResult = await queryBus.execute(getDeviceMetricsQuery);

        // Process metrics based on resolution
        let processedMetrics = metricsResult.metrics;

        // Auto resolution adjustment based on data points
        if (resolution === 'auto') {
            if (metricsResult.metrics.length > 1000) {
                // Downsample to approximately 300-500 points
                const downsampleFactor = Math.ceil(metricsResult.metrics.length / 400);
                processedMetrics = downsampleMetrics(metricsResult.metrics, downsampleFactor);
            }
        } else if (resolution !== 'raw') {
            // Apply specific resolution
            processedMetrics = aggregateMetricsByResolution(metricsResult.metrics, resolution, startDate, now);
        }

        // Group metrics by type
        const metricsByType = processedMetrics.reduce((acc: Record<string, Array<{ timestamp: Date; value: number; unit: string | null }>>, metric: any) => {
            if (!acc[metric.metric]) {
                acc[metric.metric] = [];
            }
            acc[metric.metric].push({
                timestamp: metric.timestamp,
                value: metric.value,
                unit: metric.unit,
            });
            return acc;
        }, {} as Record<string, Array<{ timestamp: Date; value: number; unit: string | null }>>);

        return ApiResponse.ok({
            metrics: metricsByType,
            period,
            resolution: resolution === 'auto' && metricsResult.metrics.length > 1000 ? 'downsampled' : resolution,
            total_points: metricsResult.metrics.length,
            processed_points: processedMetrics.length,
        });

    } catch (error) {
        console.error('❌ DEVICE METRICS GET: Failed to fetch device metrics with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to fetch device metrics');
    }
}, ServiceContainer.getInstance().getQueryBus());

// Downsample metrics by taking every nth point
function downsampleMetrics(metrics: any[], factor: number) {
    return metrics.filter((_, index) => index % factor === 0);
}

// Aggregate metrics by time resolution
function aggregateMetricsByResolution(
    metrics: any[],
    resolution: string,
    startDate: Date,
    endDate: Date
) {
    // If no metrics, return empty array
    if (metrics.length === 0) return [];

    // Group metrics by resolution bucket and metric type
    const buckets: Record<string, Record<string, { sum: number; count: number; unit: string | null }>> = {};

    metrics.forEach(metric => {
        const timestamp = new Date(metric.timestamp);
        let bucketKey: string;

        // Determine bucket key based on resolution
        switch (resolution) {
            case 'minute':
                bucketKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
                break;
            case 'hour':
                bucketKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
                break;
            case 'day':
                bucketKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
                break;
            default:
                bucketKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
        }

        if (!buckets[bucketKey]) {
            buckets[bucketKey] = {};
        }

        if (!buckets[bucketKey][metric.metric]) {
            buckets[bucketKey][metric.metric] = { sum: 0, count: 0, unit: metric.unit };
        }

        buckets[bucketKey][metric.metric].sum += metric.value;
        buckets[bucketKey][metric.metric].count += 1;
    });

    // Convert buckets to array of aggregated metrics
    const aggregatedMetrics: any[] = [];

    Object.entries(buckets).forEach(([bucketKey, metricTypes]) => {
        Object.entries(metricTypes).forEach(([metricType, { sum, count, unit }]) => {
            // Calculate average value for the bucket
            const avgValue = sum / count;

            // Create timestamp from bucket key
            const [year, month, day, hour, minute] = bucketKey.split('-').map(Number);
            let timestamp: Date;

            if (resolution === 'day') {
                timestamp = new Date(year, month, day);
            } else if (resolution === 'hour') {
                timestamp = new Date(year, month, day, hour);
            } else {
                timestamp = new Date(year, month, day, hour, minute || 0);
            }

            aggregatedMetrics.push({
                metric: metricType,
                value: avgValue,
                unit,
                timestamp,
            });
        });
    });

    // Sort by timestamp
    return aggregatedMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}