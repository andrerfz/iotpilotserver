import { NextRequest, NextResponse } from 'next/server';
import { UserStatus } from '@prisma/client';
import { withCustomerContext } from '@/lib/api-middleware';
import { tenantPrisma } from '@/lib/tenant-middleware';

// Handler for listing users with optional filtering
export const GET = withCustomerContext(async (request: NextRequest) => {
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only ADMIN or SUPERADMIN can list users
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get users with pagination
    // The tenant middleware will automatically filter by customerId
    // and exclude SUPERADMIN users from results
    const users = await tenantPrisma.client.user.findMany({
      where: filter,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        customerId: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredRole: 'ADMIN' }); // Only ADMIN or higher can access this endpoint