import {NextResponse} from 'next/server';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';

// Handler for listing users with optional filtering
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        // Get query parameters
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        // Build filter based on query parameters
        const filter: any = {};

        // Filter by status if provided
        if (status) {
            filter.status = status;
        }

        // Get current user context
        const currentUser = request.user;
        if (!currentUser) {
            return NextResponse.json({error: 'Authentication required'}, {status: 401});
        }

        // Only ADMIN or SUPERADMIN can list users
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
            return NextResponse.json({error: 'Insufficient permissions'}, {status: 403});
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

        return NextResponse.json({
            users,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('List users error:', error);
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}, {requiredRole: 'ADMIN'}); // Only ADMIN or higher can access this endpoint
