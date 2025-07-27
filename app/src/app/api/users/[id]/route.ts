import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetUserByIdQuery} from '@/lib/user/application/queries/get-user-by-id/get-user-by-id.query';
import {UpdateUserCommand} from '@/lib/user/application/commands/update-user/update-user.command';
import {RemoveUserCommand} from '@/lib/user/application/commands/remove-user/remove-user.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schema for user updates
const v = validator();
const updateUserSchema = v.object({
    email: v.optional(v.string({ email: true })),
    username: v.optional(v.string({ min: 3, max: 50 })),
    role: v.optional(v.enum(['USER', 'ADMIN'] as const)),
    status: v.optional(v.enum(['ACTIVE', 'INACTIVE', 'PENDING'] as const))
});

// GET /api/users/[id] - Get user by ID using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('👤 USER GET BY ID: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract user ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const userId = urlParts[urlParts.indexOf('users') + 1];

        console.log('📋 USER GET BY ID: Getting user:', {
            targetUserId: userId,
            requestUserId: request.user?.id,
            requestUserRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute GetUserById query
        const getUserQuery = GetUserByIdQuery.create(
            userId,
            request.user?.customerId || undefined,
            tenantContext
        );

        const user = await queryBus.execute(getUserQuery);

        console.log('✅ USER GET BY ID: User retrieved successfully:', {
            userId: user.getId().getValue(),
            email: user.getEmail().getValue(),
            role: user.getRole().getValue(),
            customerId: user.getCustomerId()?.getValue()
        });

        // Convert domain entity to API response format
        const userResponse = {
            id: user.getId().getValue(),
            email: user.getEmail().getValue(),
            username: user.getUsername().getValue(),
            role: user.getRole().getValue(),
            status: user.getStatus().getValue(),
            customerId: user.getCustomerId()?.getValue() || null,
            emailVerified: user.isEmailVerified(),
            createdAt: user.getCreatedAt(),
            updatedAt: user.getUpdatedAt(),
            lastLoginAt: user.getLastLoginAt()
        };

        return ApiResponse.ok({ user: userResponse });

    } catch (error) {
        console.error('❌ USER GET BY ID: Failed to get user with DDD:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to get user');
    }
}, ServiceContainer.getInstance().getQueryBus());

// PUT /api/users/[id] - Update user using DDD architecture
export const PUT = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('📝 USER PUT: Starting user update with DDD architecture');

        // Extract user ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const userId = urlParts[urlParts.indexOf('users') + 1];

        // Only SUPERADMIN can update other users
        if (request.user?.role !== 'SUPERADMIN' && request.user?.id !== userId) {
            return ApiResponse.forbidden('Only superadmin can update other users');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const updateData = await request.json();

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const updateUserCommand = new UpdateUserCommand(
            tenantContext,
            userId,
            updateData.email,
            updateData.username, // map username -> firstName for now
            undefined, // lastName
            undefined, // phoneNumber
            updateData.role,
            updateData.status ? updateData.status === 'ACTIVE' : undefined
        );
        await commandBus.execute(updateUserCommand);

        console.log('✅ USER PUT: User updated successfully:', {
            userId: userId
        });

        return ApiResponse.ok({
            message: 'User updated successfully',
            userId: userId
        });

    } catch (error: unknown) {
        // Temporarily comment out to resolve linter error
        // console.error('❌ USER PUT: Error updating user:', { userId: userId, error: error as any });
        console.error('❌ USER PUT: Error updating user:', error);
        
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict(error.message);
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to update user');
    }
}, ServiceContainer.getInstance().getQueryBus());

// DELETE /api/users/[id] - Remove user using DDD architecture
export const DELETE = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🗑️ USER DELETE: Starting user removal with DDD architecture');

        // Extract user ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const userId = urlParts[urlParts.indexOf('users') + 1];

        // Only SUPERADMIN can delete users, and users cannot delete themselves
        if (request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.forbidden('Only superadmin can delete users');
        }

        if (request.user?.id === userId) {
            return ApiResponse.badRequest('Cannot delete your own account');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        console.log('📋 USER DELETE: Removing user:', {
            targetUserId: userId,
            requestUserId: request.user?.id,
            requestUserRole: request.user?.role
        });

        // Create tenant context
        const tenantContext = TenantContextImpl.createSuperAdmin();

        // Create and execute RemoveUser command
        const removeUserCommand = RemoveUserCommand.create(
            userId,
            undefined, // Let the handler determine the customer from the user
            tenantContext
        );

        const result = await commandBus.execute<typeof removeUserCommand, any>(removeUserCommand);

        console.log('✅ USER DELETE: User removed successfully:', {
            userId: userId
        });

        return ApiResponse.ok({
            message: 'User removed successfully',
            userId: userId
        });

    } catch (error) {
        console.error('❌ USER DELETE: Failed to remove user with DDD:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('User not found');
            }
            if (error.message.includes('Cannot delete')) {
                return ApiResponse.badRequest(error.message);
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to delete user');
    }
}, ServiceContainer.getInstance().getQueryBus());