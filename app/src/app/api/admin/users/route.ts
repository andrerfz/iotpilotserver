import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {Pagination} from '@/lib/shared/infrastructure/http/pagination.util';

// Dynamic route: uses auth context and cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Handler for listing users with optional filtering
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        // Get query parameters - AuthenticatedRequest extends NextRequest which has url
        const url = new URL((request as any).url || (request as any).nextUrl?.href || '');
        const status = url.searchParams.get('status');
        
        // Parse and validate pagination
        const { page, limit, skip, validation } = Pagination.fromQueryParams(
            url.searchParams,
            10,  // default limit
            100  // max limit
        );

        if (!validation.isValid) {
            return ApiResponse.badRequest('Invalid pagination', validation.errors);
        }

        // Build filter based on query parameters
        const filter: any = {};

        // Filter by status if provided
        if (status) {
            filter.status = status;
        }

        // Get current user context
        const currentUser = request.user;
        if (!currentUser) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Only ADMIN or SUPERADMIN can list users
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
            return ApiResponse.forbidden('Insufficient permissions');
        }

        // Get users with pagination
        // The tenant middleware will automatically filter by customerId
        // and exclude SUPERADMIN users from results
        // Using type assertion to handle potential schema/type mismatch
        const users = await (tenantPrisma.client.user.findMany({
            where: filter,
            // We're not using select here to avoid TypeScript errors
            orderBy: {createdAt: 'desc'},
            skip,
            take: limit
        }) as unknown) as Array<{
            id: string;
            email: string;
            username: string;
            role: string;
            status: string;
            createdAt: Date;
            customerId?: string;
        }>;

        // Get total count for pagination
        const totalCount = await tenantPrisma.client.user.count({
            where: filter
        });

        // Create standardized pagination
        const pagination = Pagination.create(page, limit, totalCount);

        return ApiResponse.okPaginated(users, pagination);
    } catch (error) {
        console.error('List users error:', error);
        return ApiResponse.internalError('Internal server error');
    }
}, {requiredRole: 'ADMIN'}); // Only ADMIN or higher can access this endpoint
