import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Ensure this route is always dynamic (uses cookies)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/auth/me - Get current user using DDD architecture
export const GET = withAuthMiddleware(async (request: AuthenticatedRequest) => {
    try {

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Import GetCurrentUserQuery here to avoid circular imports
        const { GetCurrentUserQuery } = await import('@/lib/user/application/queries/get-current-user/get-current-user.query');

        // Create and execute GetCurrentUser query
        const getCurrentUserQuery = request.user?.customerId
            ? GetCurrentUserQuery.createForTenant(request.user.id, request.user.customerId)
            : GetCurrentUserQuery.createSuperAdmin(request.user!.id);

        const user = await queryBus.execute(getCurrentUserQuery);

        if (!user) {
            return ApiResponse.notFound('User not found');
        }

        // Convert domain entity to API response format
        const userData = {
            id: user.getId().getValue(),
            email: user.getEmail().getValue(),
            username: user.getUsername(),  // Returns string directly, not a VO
            role: user.getRole().getValue(),
            customerId: user.getCustomerId()?.getValue() || null,
            createdAt: user.getCreatedAt(),
            // TODO: Implement device and alert counts via separate queries
            _count: {
                devices: 0,
                alerts: 0
            }
        };

        return ApiResponse.ok({ user: userData });

    } catch (error) {
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Internal server error');
    }
}, ServiceContainer.getInstance().getQueryBus());