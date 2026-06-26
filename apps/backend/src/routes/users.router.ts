import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { ListUsersQuery } from '@iotpilot/core/user/application/queries/list-users/list-users.query';
import { RegisterUserCommand } from '@iotpilot/core/user/application/commands/register-user/register-user.command';
import { GetCurrentUserQuery } from '@iotpilot/core/user/application/queries/get-current-user/get-current-user.query';
import { GetUserByIdQuery } from '@iotpilot/core/user/application/queries/get-user-by-id/get-user-by-id.query';
import { UpdateUserCommand } from '@iotpilot/core/user/application/commands/update-user/update-user.command';
import { RemoveUserCommand } from '@iotpilot/core/user/application/commands/remove-user/remove-user.command';
import { GetUserProfileQuery } from '@iotpilot/core/user/application/queries/get-user-profile/get-user-profile.query';
import { UpdateUserProfileCommand } from '@iotpilot/core/user/application/commands/update-user-profile/update-user-profile.command';
import { GetNotificationPreferencesQuery } from '@iotpilot/core/notification/application/queries/get-notification-preferences/get-notification-preferences.query';
import { UpdateNotificationPreferenceCommand } from '@iotpilot/core/notification/application/commands/update-notification-preference/update-notification-preference.command';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
import { resolveUserPublicId } from '@iotpilot/core/user/infrastructure/services/user-id-resolver';
import { z } from 'zod';

function isoTimestamp(): string {
    return new Date().toISOString();
}

// Validation schemas
const v = validator();
const complexPasswordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/);
export const createUserSchema = v.object({
    email: v.string({ email: true }),
    username: v.string({ min: 3, max: 50 }),
    password: (v as any).fromZodSchema(complexPasswordSchema),
    customerId: v.string({ min: 1, message: 'customerId is required' }),
    role: v.optional(v.enum(['USER', 'ADMIN'] as const))
});

export const updateUserSchema = v.object({
    email: v.optional(v.string({ email: true })),
    firstName: v.optional(v.string({ min: 1, max: 100 })),
    lastName: v.optional(v.string({ min: 1, max: 100 })),
    phoneNumber: v.optional(v.string({ max: 30 })),
    role: v.optional(v.enum(['USER', 'ADMIN'] as const)),
    status: v.optional(v.enum(['ACTIVE', 'INACTIVE', 'PENDING'] as const))
});

export const updateProfileSchema = v.object({
    username: v.optional(v.string({ min: 3, max: 50 })),
    displayName: v.optional(v.string({ min: 1, max: 100 })),
    preferences: v.optional(v.record(v.string(), v.any()))
});

export const updatePreferenceSchema = v.object({
    channel: v.string({ min: 1, message: 'channel is required' }),
    notificationType: v.string({ min: 1, message: 'notificationType is required' }),
    enabled: v.boolean(),
    destination: v.optional(v.nullable(v.string())),
});

const isAdminOrSuperAdmin = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';

export const usersRouter = Router();

// GET /users - List users
usersRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('👥 USERS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const filters = {
            role: req.query.role as string | undefined,
            status: req.query.status as string | undefined,
            search: req.query.search as string | undefined,
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 20
        };

        console.log('📋 USERS GET: Listing users with filters:', {
            filters,
            requestUserId: req.user?.id,
            requestUserRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Create tenant context - only superadmin can list users across tenants
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Determine which customer's users to list
        const targetCustomerId = req.user?.role === 'SUPERADMIN'
            ? (req.query.customerId as string | undefined) || req.user?.customerId
            : req.user?.customerId;

        // Create and execute ListUsers query
        const listUsersQuery = ListUsersQuery.fromRequest(
            {
                query: {
                    page: String(filters.page),
                    limit: String(filters.limit),
                    role: filters.role,
                    active: filters.status ? String(filters.status === 'ACTIVE') : undefined,
                    search: filters.search
                }
            } as any,
            tenantContext
        );

        const result = await queryBus.execute(listUsersQuery);

        console.log('✅ USERS GET: Users retrieved successfully:', {
            count: result.users.length,
            total: result.total,
            page: result.page,
            hasMore: result.hasMore,
            customerId: targetCustomerId
        });

        const usersResponse = result.users.map((user: any) => ({
            id: user.id,
            email: user.email,
            username: user.displayName || user.fullName || user.email,
            role: user.role,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            customerId: user.customerId || null,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLogin || null
        }));

        const pagination = Pagination.create(result.page, result.limit, result.total);

        send.ok(res, usersResponse, {
            pagination,
            filters: {
                applied: filters,
                available: {
                    roles: ['USER', 'ADMIN', 'SUPERADMIN'],
                    statuses: ['ACTIVE', 'INACTIVE', 'PENDING']
                }
            }
        });
        return;

    } catch (err) {
        console.error('❌ USERS GET: Failed to list users with DDD:', err);
        send.fromError(res, err);
    }
});

// POST /users - Create new user
usersRouter.post('/', requireAuth('SUPERADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('👤 USERS POST: Starting user creation with DDD architecture');

        // Only SUPERADMIN can create users via API (enforced by requireAuth above)
        if (req.user?.role !== 'SUPERADMIN') {
            send.forbidden(res, 'Only superadmin can create users via API');
            return;
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;
        const parsed = createUserSchema.parse(body);
        const { email, username, password: passwordValue, customerId: targetCustomerId, role = 'USER' } = parsed;

        // Type assertion for password from fromZodSchema
        const password: string = passwordValue as string;

        console.log('📋 USERS POST: Creating user:', {
            email,
            username,
            role,
            customerId: targetCustomerId,
            requestUserId: req.user?.id
        });

        const customerIdVO = CustomerId.create(targetCustomerId);
        const targetTenantContext = TenantContextImpl.createCustomerAdmin(customerIdVO);

        const registerUserCommand = new RegisterUserCommand(
            targetTenantContext,
            email,
            password,
            username,
            '',
            undefined,
            role
        );
        const result = await commandBus.execute(registerUserCommand);

        console.log('✅ USERS POST: User created successfully:', {
            email,
            username,
            role,
            customerId: targetCustomerId
        });

        send.created(res, {
            message: 'User created successfully',
            user: {
                email,
                username,
                role,
                customerId: targetCustomerId,
                status: 'ACTIVE'
            }
        });
        return;

    } catch (err) {
        console.error('❌ USERS POST: Failed to create user with DDD:', err);
        send.fromError(res, err);
    }
});

// GET /users/current - Get current user details
usersRouter.get('/current', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 USER CURRENT GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        console.log('📋 USER CURRENT GET: Getting current user:', {
            userId: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
            customerId: req.user?.customerId
        });

        // Create and execute GetCurrentUser query
        const getCurrentUserQuery = GetCurrentUserQuery.create(
            req.user!.id,
            req.user?.customerId || undefined
        );

        const currentUser = await queryBus.execute(getCurrentUserQuery);

        console.log('✅ USER CURRENT GET: Current user retrieved successfully:', {
            userId: currentUser.publicId || currentUser.getId().getValue(),
            email: currentUser.email.getValue(),
            role: currentUser.role.getValue(),
            customerId: currentUser.customerId?.getValue()
        });

        const response = {
            id: currentUser.publicId || currentUser.id.getValue(),
            email: currentUser.email.getValue(),
            username: currentUser.getUsername ? currentUser.getUsername() : currentUser.username,
            role: currentUser.role.getValue(),
            customerId: currentUser.customerId?.getValue() || null,
            status: currentUser.isActive ? 'ACTIVE' : 'INACTIVE',
            createdAt: currentUser.createdAt,
            updatedAt: currentUser.updatedAt,
            lastLoginAt: currentUser.lastLogin || null,
            profile: {
                displayName: currentUser.getUsername ? currentUser.getUsername() : currentUser.username,
            },
            permissions: {
                canManageDevices: ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.getValue()),
                canManageUsers: ['SUPERADMIN'].includes(currentUser.role.getValue()),
                canViewAnalytics: ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.getValue()),
                canManageSystem: ['SUPERADMIN'].includes(currentUser.role.getValue())
            },
            customer: await (async () => {
                if (!currentUser.customerId) return null;
                const cid = currentUser.customerId.getValue();
                const prisma = ServiceContainer.getInstance().getPrismaClient().getClient();
                const customer = await prisma.customer.findUnique({
                    where: { id: cid },
                    select: { id: true, name: true, slug: true },
                });
                return customer ? { id: customer.id, name: customer.name, slug: customer.slug } : { id: cid, name: 'Unknown', slug: 'unknown' };
            })(),
            timestamp: new Date().toISOString()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ USER CURRENT GET: Failed to get current user with DDD:', err);
        send.fromError(res, err);
    }
});

// GET /users/:id - Get user by ID
usersRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('👤 USER GET BY ID: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;

        const internalId = await resolveUserPublicId(publicId);
        if (!internalId) {
            send.notFound(res, 'User not found');
            return;
        }
        const userId = internalId;

        // Only the user themselves or ADMIN/SUPERADMIN can fetch a user record
        const requesterRole = req.user?.role;
        if (requesterRole !== 'SUPERADMIN' && requesterRole !== 'ADMIN' && req.user?.id !== userId) {
            send.forbidden(res, 'Access denied');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const getUserQuery = GetUserByIdQuery.create(
            userId,
            req.user?.customerId || undefined,
            tenantContext
        );

        const user = await queryBus.execute(getUserQuery);

        send.ok(res, {
            user: {
                id: user.publicId,
                email: user.getEmail().getValue(),
                username: user.getUsername(),
                role: user.getRole().getValue(),
                status: user.isActive ? 'ACTIVE' : 'INACTIVE',
                customerId: user.getCustomerId()?.getValue() || null,
                firstName: user.firstName || null,
                lastName: user.lastName || null,
                createdAt: user.getCreatedAt(),
                updatedAt: user.getUpdatedAt(),
                lastLoginAt: user.lastLogin || null,
            }
        });
        return;

    } catch (err) {
        console.error('❌ USER GET BY ID: Failed to get user with DDD:', err);
        send.fromError(res, err);
    }
});

// PUT /users/:id - Update user
usersRouter.put('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('📝 USER PUT: Starting user update with DDD architecture');

        const publicId = req.params.id;

        const internalId = await resolveUserPublicId(publicId);
        if (!internalId) {
            send.notFound(res, 'User not found');
            return;
        }
        const userId = internalId;

        // Only SUPERADMIN can update other users
        if (req.user?.role !== 'SUPERADMIN' && req.user?.id !== userId) {
            send.forbidden(res, 'Only superadmin can update other users');
            return;
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const updateData = { ...req.body };
        if (req.user?.role !== 'SUPERADMIN') {
            delete (updateData as Record<string, unknown>).role;
            delete (updateData as Record<string, unknown>).status;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const updateUserCommand = new UpdateUserCommand(
            tenantContext,
            userId,
            updateData.email,
            updateData.firstName,
            updateData.lastName,
            updateData.phoneNumber,
            updateData.role,
            updateData.status ? updateData.status === 'ACTIVE' : undefined
        );
        await commandBus.execute(updateUserCommand);

        console.log('✅ USER PUT: User updated successfully:', {
            userId: userId
        });

        send.ok(res, {
            message: 'User updated successfully',
            userId: publicId
        });
        return;

    } catch (err: unknown) {
        console.error('❌ USER PUT: Error updating user:', err);
        send.fromError(res, err);
    }
});

// DELETE /users/:id - Remove user
usersRouter.delete('/:id', requireAuth('SUPERADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🗑️ USER DELETE: Starting user removal with DDD architecture');

        const publicId = req.params.id;

        const internalId = await resolveUserPublicId(publicId);
        if (!internalId) {
            send.notFound(res, 'User not found');
            return;
        }
        const userId = internalId;

        // Only SUPERADMIN can delete users, and users cannot delete themselves
        if (req.user?.role !== 'SUPERADMIN') {
            send.forbidden(res, 'Only superadmin can delete users');
            return;
        }

        if (req.user?.id === userId) {
            send.badRequest(res, 'Cannot delete your own account');
            return;
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        console.log('📋 USER DELETE: Removing user:', {
            targetUserId: userId,
            requestUserId: req.user?.id,
            requestUserRole: req.user?.role
        });

        // Create tenant context
        const tenantContext = TenantContextImpl.createSuperAdmin();

        const removeUserCommand = RemoveUserCommand.create(
            userId,
            undefined, // Let the handler determine the customer from the user
            tenantContext
        );

        const result = await commandBus.execute<typeof removeUserCommand, any>(removeUserCommand);

        console.log('✅ USER DELETE: User removed successfully:', {
            userId: userId
        });

        send.ok(res, {
            message: 'User removed successfully',
            userId: publicId
        });
        return;

    } catch (err) {
        console.error('❌ USER DELETE: Failed to remove user with DDD:', err);
        send.fromError(res, err);
    }
});

// GET /users/:id/profile - Get user profile
usersRouter.get('/:id/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('👤 USER PROFILE GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;

        const internalId = await resolveUserPublicId(publicId);
        if (!internalId) {
            send.notFound(res, 'User not found');
            return;
        }
        const userId = internalId;

        console.log('📋 USER PROFILE GET: Getting user profile:', {
            targetUserId: userId,
            requestUserId: req.user?.id,
            requestUserRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Users can only view their own profile unless they are SUPERADMIN
        if (req.user?.role !== 'SUPERADMIN' && req.user?.id !== userId) {
            send.forbidden(res, 'Access denied: Can only view your own profile');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const getUserProfileQuery = GetUserProfileQuery.create(
            userId,
            req.user?.customerId || undefined,
            tenantContext
        );

        const profileResult = await queryBus.execute(getUserProfileQuery);

        console.log('✅ USER PROFILE GET: User profile retrieved successfully:', {
            userId: profileResult.id,
            email: profileResult.email,
            username: profileResult.username,
            customerId: profileResult.customerId
        });

        send.ok(res, { profile: profileResult });
        return;

    } catch (err) {
        console.error('❌ USER PROFILE GET: Failed to get user profile with DDD:', err);
        send.fromError(res, err);
    }
});

// PUT /users/:id/profile - Update user profile
usersRouter.put('/:id/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('📝 USER PROFILE PUT: Starting profile update with DDD architecture');

        const publicId = req.params.id;

        const internalId = await resolveUserPublicId(publicId);
        if (!internalId) {
            send.notFound(res, 'User not found');
            return;
        }
        const userId = internalId;

        // Users can only update their own profile unless they are SUPERADMIN
        if (req.user?.role !== 'SUPERADMIN' && req.user?.id !== userId) {
            send.forbidden(res, 'Access denied: Can only update your own profile');
            return;
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;
        const profileData = updateProfileSchema.parse(body);

        console.log('📋 USER PROFILE PUT: Updating user profile:', {
            targetUserId: userId,
            profileData,
            requestUserId: req.user?.id,
            requestUserRole: req.user?.role
        });

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const updateProfileCommand = UpdateUserProfileCommand.create(
            userId,
            profileData,
            req.user?.customerId || undefined,
            tenantContext
        );

        const result = await commandBus.execute<typeof updateProfileCommand, any>(updateProfileCommand);

        console.log('✅ USER PROFILE PUT: User profile updated successfully:', {
            userId: result.user.id,
            username: result.user.username,
            displayName: result.profile.displayName
        });

        send.ok(res, {
            message: 'Profile updated successfully',
            user: result.user,
            profile: result.profile
        });
        return;

    } catch (err) {
        console.error('❌ USER PROFILE PUT: Failed to update profile with DDD:', err);
        send.fromError(res, err);
    }
});

// GET /users/:id/notification-preferences - Get notification preferences
usersRouter.get('/:id/notification-preferences', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const customerId = req.user?.customerId;
        if (!customerId) {
            send.forbidden(res, 'Tenant context required');
            return;
        }

        const userId = req.params.id;

        // Users can only read their own preferences; ADMIN/SUPERADMIN can read any
        if (!isAdminOrSuperAdmin(req.user?.role) && userId !== req.user?.id) {
            send.forbidden(res, 'Access denied');
            return;
        }

        const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
        const queryBus = ServiceContainer.getInstance().getQueryBus();

        const prefs = await queryBus.execute(
            GetNotificationPreferencesQuery.create(userId, customerId, tenantContext)
        );

        send.ok(res, prefs);
        return;

    } catch (err) {
        send.fromError(res, err);
    }
});

// PUT /users/:id/notification-preferences - Update notification preferences
usersRouter.put('/:id/notification-preferences', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const customerId = req.user?.customerId;
        if (!customerId) {
            send.forbidden(res, 'Tenant context required');
            return;
        }

        const userId = req.params.id;

        // Users can only update their own preferences; ADMIN/SUPERADMIN can update any
        if (!isAdminOrSuperAdmin(req.user?.role) && userId !== req.user?.id) {
            send.forbidden(res, 'Access denied');
            return;
        }

        const body = req.body;
        const parsed = updatePreferenceSchema.safeParse(body);
        if (!parsed.success || !parsed.data) {
            send.badRequest(res, 'Invalid request body', (parsed as any).errors);
            return;
        }

        const { channel, notificationType, enabled, destination } = parsed.data;
        const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
        const commandBus = ServiceContainer.getInstance().getCommandBus();

        await commandBus.execute(UpdateNotificationPreferenceCommand.create({
            userId,
            customerId,
            channel,
            notificationType,
            enabled,
            destination: destination ?? null,
            tenantContext,
        }));

        send.ok(res, { updated: true });
        return;

    } catch (err) {
        send.fromError(res, err);
    }
});

// ──────────────────────────────────────────────────────────────
// Push token management (fe-mobile T8)
// One token per user — POST upserts, DELETE removes.
// ──────────────────────────────────────────────────────────────
export const pushTokenSchema = v.object({
    token: v.string({ min: 1, message: 'token is required' }),
    platform: v.enum(['ios', 'android'] as const),
});

// POST /users/me/push-token — register FCM/APNs token for the current user
usersRouter.post('/me/push-token', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const customerId = req.user?.customerId;
        if (!userId || !customerId) {
            send.forbidden(res, 'Authentication required');
            return;
        }

        const parsed = pushTokenSchema.safeParse(req.body);
        if (!parsed.success) {
            send.badRequest(res, 'Invalid request body');
            return;
        }

        const { token, platform } = parsed.data;
        const db = prisma.getClient();

        // One token per user: delete any existing token, then insert the new one.
        await db.$transaction([
            db.userPushToken.deleteMany({ where: { userId, deletedAt: null } }),
            db.userPushToken.create({
                data: {
                    userId,
                    customerId,
                    platform: platform === 'ios' ? 'IOS' : 'ANDROID',
                    token,
                    lastSeenAt: new Date(),
                },
            }),
        ]);

        send.created(res, { registered: true });
        return;
    } catch (err) {
        send.fromError(res, err);
    }
});

// DELETE /users/me/push-token — remove the push token for the current user
usersRouter.delete('/me/push-token', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            send.forbidden(res, 'Authentication required');
            return;
        }

        const db = prisma.getClient();
        await db.userPushToken.deleteMany({ where: { userId, deletedAt: null } });

        send.ok(res, { deregistered: true });
        return;
    } catch (err) {
        send.fromError(res, err);
    }
});
