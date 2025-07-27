import {NextRequest} from 'next/server';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {authenticate} from '@/lib/shared/infrastructure/authentication/auth.service';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {GetDeviceCommandQuery} from '@/lib/device/application/queries/get-device-command/get-device-command.query';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

/**
 * GET /api/devices/:id/commands/:commandId - Get command details
 * Uses CQRS pattern with GetDeviceCommandQuery
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string, commandId: string } }
) {
    try {
        // 1. AUTHENTICATION
        const { user, error } = await authenticate(request);
        if (error || !user) {
            return ApiResponse.unauthorized('Unauthorized');
        }

        const { id, commandId } = params;

        // 2. CREATE TENANT CONTEXT
        const tenantContext = user.customerId
            ? TenantContextImpl.create(CustomerId.fromString(user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // 3. CREATE AND EXECUTE QUERY
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const query = GetDeviceCommandQuery.create(id, commandId, tenantContext);
        const command = await queryBus.execute(query);

        if (!command) {
            return ApiResponse.notFound('Command not found');
        }

        // 4. RETURN RESPONSE
        return ApiResponse.ok({ command });

    } catch (error) {
        logger.error('Failed to fetch command details', error instanceof Error ? error : undefined);
        return ApiResponse.internalError('Failed to fetch command details');
    }
}
