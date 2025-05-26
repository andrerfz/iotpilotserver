// app/src/app/api/devices/[id]/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/devices/:id/metrics - Get device metrics
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const metric = searchParams.get('metric') || 'all'; // 'all', 'cpu_usage', 'memory_usage', etc.
        const period = searchParams.get('period') || '24h'; // '1h', '24h', '7d', '30d'
        const resolution = searchParams.get('resolution') || 'auto'; // 'auto', 'raw', 'minute', 'hour', 'day'

        // Check if device exists
        const device = await prisma.device.findUnique({
            where: { id },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

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

        // Determine metrics to fetch
        const metricsFilter = metric === 'all'
            ? undefined
            : {
                metric: {
                    in: metric.split(','),
                },
            };

        // Query metrics from database with appropriate time range
        const metrics = await prisma.deviceMetric.findMany({
            where: {
                deviceId: id,
                timestamp: {
                    gte: startDate,
                },
                ...metricsFilter,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        // Process metrics based on resolution
        let processedMetrics = metrics;

        // Auto resolution adjustment based on data points
        if (resolution === 'auto') {
            if (metrics.length > 1000) {
                // Downsample to approximately 300-500 points
                const downsampleFactor = Math.ceil(metrics.length / 400);
                processedMetrics = downsampleMetrics(metrics, downsampleFactor);
            }
        } else if (resolution !== 'raw') {
            // Apply specific resolution
            processedMetrics = aggregateMetricsByResolution(metrics, resolution, startDate, now);
        }

        // Group metrics by type
        const metricsByType = processedMetrics.reduce((acc, metric) => {
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

        return NextResponse.json({
            metrics: metricsByType,
            period,
            resolution: resolution === 'auto' && metrics.length > 1000 ? 'downsampled' : resolution,
            total_points: metrics.length,
            processed_points: processedMetrics.length,
        });
    } catch (error) {
        console.error('Failed to fetch device metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device metrics' },
            { status: 500 }
        );
    }
}

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