// app/src/app/api/users/current/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetCurrentUserQuery} from '@/lib/user/application/queries/get-current-user/get-current-user.query';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Ensure this route is always dynamic (uses cookies)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/current - Get current user details using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 USER CURRENT GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        console.log('📋 USER CURRENT GET: Getting current user:', {
            userId: request.user?.id,
            email: request.user?.email,
            role: request.user?.role,
            customerId: request.user?.customerId
        });

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute GetCurrentUser query
        const getCurrentUserQuery = GetCurrentUserQuery.create(
            request.user!.id,
            request.user?.customerId || undefined
        );

        const currentUser = await queryBus.execute(getCurrentUserQuery);

        console.log('✅ USER CURRENT GET: Current user retrieved successfully:', {
            userId: currentUser.id.getValue(),
            email: currentUser.email.getValue(),
            role: currentUser.role.getValue(),
            customerId: currentUser.customerId?.getValue()
        });

        // Convert domain entity to API response format
        const response = {
            id: currentUser.id.getValue(),
            email: currentUser.email.getValue(),
            username: currentUser.username.getValue(),
            role: currentUser.role.getValue(),
            customerId: currentUser.customerId?.getValue() || null,
            status: currentUser.status.getValue(),
            emailVerified: currentUser.emailVerified,
            createdAt: currentUser.createdAt,
            updatedAt: currentUser.updatedAt,
            lastLoginAt: currentUser.lastLoginAt || null,
            profile: {
                displayName: currentUser.username.getValue(),
                // Add other profile fields as they become available
            },
            permissions: {
                canManageDevices: ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.getValue()),
                canManageUsers: ['SUPERADMIN'].includes(currentUser.role.getValue()),
                canViewAnalytics: ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.getValue()),
                canManageSystem: ['SUPERADMIN'].includes(currentUser.role.getValue())
            },
            customer: currentUser.customerId ? {
                id: currentUser.customerId.getValue(),
                name: 'Customer', // TODO: Implement customer name lookup
                slug: 'customer' // TODO: Implement customer slug lookup
            } : null,
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ USER CURRENT GET: Failed to get current user with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to get current user');
    }
}, ServiceContainer.getInstance().getQueryBus());