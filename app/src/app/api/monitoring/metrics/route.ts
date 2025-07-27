// app/src/app/api/monitoring/metrics/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetSystemMetricsQuery} from '@/lib/monitoring/application/queries/get-system-metrics/get-system-metrics.query';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Ensure this route is always dynamic (uses cookies)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/monitoring/metrics - Get system metrics using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING METRICS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const startTimeParam = searchParams.get('startTime');
        const endTimeParam = searchParams.get('endTime');
        const period = searchParams.get('period') || '24h'; // '1h', '24h', '7d', '30d'
        const metricNames = searchParams.get('metrics')?.split(',').filter(Boolean);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        console.log('📋 MONITORING METRICS GET: Query params:', {
            startTime: startTimeParam,
            endTime: endTimeParam,
            period,
            metricNames,
            limit,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Calculate date range based on period or explicit dates
        let startTime: Date | undefined;
        let endTime: Date | undefined;

        if (startTimeParam && endTimeParam) {
            startTime = new Date(startTimeParam);
            endTime = new Date(endTimeParam);
        } else {
            // Calculate based on period
            const now = new Date();
            endTime = now;

            switch (period) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '6h':
                    startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default: // 24h is default
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
        }

        // Validate date range
        if (startTime && endTime && startTime >= endTime) {
            return ApiResponse.badRequest('Start time must be before end time');
        }

        // Get tenant ID - use customer ID from user context or allow SUPERADMIN to specify
        const tenantId = request.user?.customerId;
        if (!tenantId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for metrics access');
        }

        // Create and execute GetSystemMetrics query
        const getSystemMetricsQuery = GetSystemMetricsQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            startTime,
            endTime,
            metricNames,
            limit
        );

        const metricsResult = await queryBus.execute(getSystemMetricsQuery);

        console.log('✅ MONITORING METRICS GET: System metrics retrieved successfully:', {
            metricsCount: metricsResult.metrics?.length || 0,
            period,
            startTime: startTime?.toISOString(),
            endTime: endTime?.toISOString(),
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            metrics: metricsResult.metrics || [],
            summary: metricsResult.summary || {},
            timeRange: {
                startTime: startTime?.toISOString(),
                endTime: endTime?.toISOString(),
                period
            },
            filters: {
                metricNames: metricNames || [],
                limit
            },
            metadata: {
                totalMetrics: metricsResult.metrics?.length || 0,
                availableMetrics: metricsResult.availableMetrics || [],
                lastUpdated: metricsResult.lastUpdated || new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ MONITORING METRICS GET: Failed to fetch system metrics with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('TimeRange') || error.message.includes('invalid date')) {
                return ApiResponse.badRequest('Invalid time range parameters');
            }
            if (error.message.includes('Tenant access violation') || error.message.includes('access denied')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Metrics not found');
            }
        }

        return ApiResponse.internalError('Failed to fetch system metrics');
    }
}, ServiceContainer.getInstance().getQueryBus());