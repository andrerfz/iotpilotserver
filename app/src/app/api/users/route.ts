import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {ListUsersQuery} from '@/lib/user/application/queries/list-users/list-users.query';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {Pagination} from '@/lib/shared/infrastructure/http/pagination.util';
import {z} from 'zod'; // Keep for complex regex validation

// Validation schema for user creation
// Note: Complex password validation with multiple regex - using fromZodSchema
const v = validator();
const complexPasswordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/);
const createUserSchema = v.object({
    email: v.string({ email: true }),
    username: v.string({ min: 3, max: 50 }),
    password: (v as any).fromZodSchema(complexPasswordSchema),
    role: v.optional(v.enum(['USER', 'ADMIN'] as const))
});

// GET /api/users - List users using DDD architecture
export const GET = withAuthMiddleware(async (request: AuthenticatedRequest) => {
    try {
        console.log('👥 USERS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const filters = {
            role: searchParams.get('role') || undefined,
            status: searchParams.get('status') || undefined,
            search: searchParams.get('search') || undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
        };

        console.log('📋 USERS GET: Listing users with filters:', {
            filters,
            requestUserId: request.user?.id,
            requestUserRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Create tenant context - only superadmin can list users across tenants
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Determine which customer's users to list
        const targetCustomerId = request.user?.role === 'SUPERADMIN'
            ? searchParams.get('customerId') || request.user?.customerId
            : request.user?.customerId;

        // Create and execute ListUsers query (ListUsersQuery exposes fromRequest, not create)
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

        // Convert domain entities to API response format
        const usersResponse = result.users.map((user: any) => ({
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
        }));

        // Create standardized pagination
        const pagination = Pagination.create(result.page, result.limit, result.total);

        return ApiResponse.okPaginated(usersResponse, pagination, undefined, {
            filters: {
                applied: filters,
                available: {
                    roles: ['USER', 'ADMIN', 'SUPERADMIN'],
                    statuses: ['ACTIVE', 'INACTIVE', 'PENDING']
                }
            }
        });

    } catch (error) {
        console.error('❌ USERS GET: Failed to list users with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Customer not found');
            }
        }

        return ApiResponse.internalError('Failed to list users');
    }
}, ServiceContainer.getInstance().getQueryBus());

// POST /api/users - Create new user using DDD architecture
export const POST = withAuthMiddleware(async (request: AuthenticatedRequest) => {
    try {
        console.log('👤 USERS POST: Starting user creation with DDD architecture');

        // Only SUPERADMIN can create users via API
        if (request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.forbidden('Only superadmin can create users via API');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();
        const parsed = createUserSchema.parse(body);
        const { email, username, password: passwordValue, role = 'USER' } = parsed;
        
        // Type assertion for password from fromZodSchema (TypeScript can't infer the type)
        const password: string = passwordValue as string;

        console.log('📋 USERS POST: Creating user:', {
            email,
            username,
            role,
            requestUserId: request.user?.id
        });

        // Determine customer ID from email domain or request
        const emailDomain = email.split('@')[1];
        const targetCustomerId = body.customerId || `customer_${emailDomain.split('.')[0]}`;

        // Create tenant context
        const tenantContext = TenantContextImpl.createSuperAdmin();

        const customerIdVO = CustomerId.create(targetCustomerId);
        const targetTenantContext = TenantContextImpl.createCustomerAdmin(customerIdVO);

        // Create user using RegisterUser command (map username -> firstName for now)
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

        return ApiResponse.created({
            message: 'User created successfully',
            user: {
                email,
                username,
                role,
                customerId: targetCustomerId,
                status: 'ACTIVE'
            }
        });

    } catch (error) {
        console.error('❌ USERS POST: Failed to create user with DDD:', error);
        
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict(error.message);
            }
            if (error.message.includes('validation')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to create user');
    }
}, ServiceContainer.getInstance().getQueryBus());