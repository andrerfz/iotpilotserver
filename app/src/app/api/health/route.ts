import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetSystemHealthQuery} from '@/lib/shared/application/queries/get-system-health/get-system-health.query';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health - Get system health status
 * Uses CQRS pattern with GetSystemHealthQuery
 * Public endpoint - no authentication required
 */
export async function GET() {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const query = GetSystemHealthQuery.create();
        const health = await queryBus.execute(query);

        if (health.status === 'healthy') {
            return ApiResponse.ok(health);
        } else {
            return ApiResponse.serviceUnavailable('Service unhealthy', health);
        }

    } catch (error) {
        logger.error('Health check failed', error instanceof Error ? error : undefined);

        return ApiResponse.serviceUnavailable('Health check failed', {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            uptime: Math.floor(process.uptime())
        });
    }
}
