import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetUserProfileQuery} from '@/lib/user/application/queries/get-user-profile/get-user-profile.query';
import {
    UpdateUserProfileCommand
} from '@/lib/user/application/commands/update-user-profile/update-user-profile.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

// Validation schema for profile updates
const v = validator();
const updateProfileSchema = v.object({
    username: v.optional(v.string({ min: 3, max: 50 })),
    displayName: v.optional(v.string({ min: 1, max: 100 })),
    preferences: v.optional(v.record(v.string(), v.any()))
});

// GET /api/users/[id]/profile - Get user profile using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('👤 USER PROFILE GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract user ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const userId = urlParts[urlParts.indexOf('users') + 1];

        console.log('📋 USER PROFILE GET: Getting user profile:', {
            targetUserId: userId,
            requestUserId: request.user?.id,
            requestUserRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Users can only view their own profile unless they are SUPERADMIN
        if (request.user?.role !== 'SUPERADMIN' && request.user?.id !== userId) {
            return ApiResponse.forbidden('Access denied: Can only view your own profile');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute GetUserProfile query
        const getUserProfileQuery = GetUserProfileQuery.create(
            userId,
            request.user?.customerId || undefined,
            tenantContext
        );

        const profileResult = await queryBus.execute(getUserProfileQuery);

        console.log('✅ USER PROFILE GET: User profile retrieved successfully:', {
            userId: profileResult.id,
            email: profileResult.email,
            username: profileResult.username,
            customerId: profileResult.customerId
        });

        return ApiResponse.ok({ profile: profileResult });

    } catch (error) {
        console.error('❌ USER PROFILE GET: Failed to get user profile with DDD:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to get user profile');
    }
}, ServiceContainer.getInstance().getQueryBus());

// PUT /api/users/[id]/profile - Update user profile using DDD architecture
export const PUT = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('📝 USER PROFILE PUT: Starting profile update with DDD architecture');

        // Extract user ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const userId = urlParts[urlParts.indexOf('users') + 1];

        // Users can only update their own profile unless they are SUPERADMIN
        if (request.user?.role !== 'SUPERADMIN' && request.user?.id !== userId) {
            return ApiResponse.forbidden('Access denied: Can only update your own profile');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();
        const profileData = updateProfileSchema.parse(body);

        console.log('📋 USER PROFILE PUT: Updating user profile:', {
            targetUserId: userId,
            profileData,
            requestUserId: request.user?.id,
            requestUserRole: request.user?.role
        });

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute UpdateUserProfile command
        const updateProfileCommand = UpdateUserProfileCommand.create(
            userId,
            profileData,
            request.user?.customerId || undefined,
            tenantContext
        );

        const result = await commandBus.execute<typeof updateProfileCommand, any>(updateProfileCommand);

        console.log('✅ USER PROFILE PUT: User profile updated successfully:', {
            userId: result.user.id,
            username: result.user.username,
            displayName: result.profile.displayName
        });

        return ApiResponse.ok({
            message: 'Profile updated successfully',
            user: result.user,
            profile: result.profile
        });

    } catch (error) {
        console.error('❌ USER PROFILE PUT: Failed to update profile with DDD:', error);
        
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map((err: z.ZodIssue) => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to update profile');
    }
}, ServiceContainer.getInstance().getQueryBus());