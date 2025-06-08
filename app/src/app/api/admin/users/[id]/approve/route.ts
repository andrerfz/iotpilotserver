import {NextResponse} from 'next/server';
import {z} from 'zod';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';

// Define UserStatus enum values directly since there's an issue with importing from @prisma/client
enum UserStatus {
    ACTIVE = 'ACTIVE',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED',
    INACTIVE = 'INACTIVE'
}

// Validation schema for approval action
const approvalSchema = z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional()
});

// Handler for approving or rejecting a user
export const POST = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        // Get user ID from URL
        const id = request.url.split('/').pop()?.split('/')[0];
        if (!id) {
            return NextResponse.json({error: 'User ID is required'}, {status: 400});
        }

        // Parse request body
        const body = await request.json();
        const {
            action,
            reason
        } = approvalSchema.parse(body);

        // Get current user context
        const currentUser = request.user;
        if (!currentUser) {
            return NextResponse.json({error: 'Authentication required'}, {status: 401});
        }

        // Only ADMIN or SUPERADMIN can approve/reject users
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
            return NextResponse.json({error: 'Insufficient permissions'}, {status: 403});
        }

        // Find the user to approve/reject
        // The tenant middleware will automatically filter by customerId
        // and exclude SUPERADMIN users from results
        const userToUpdate = await tenantPrisma.client.user.findUnique({
            where: {id}
        }) as unknown as {
            id: string;
            email: string;
            username: string;
            role: string;
            status: UserStatus;
            customerId?: string;
        };

        if (!userToUpdate) {
            return NextResponse.json({error: 'User not found'}, {status: 404});
        }

        // Check if user is already in the requested state
        if (
            (action === 'approve' && userToUpdate.status === UserStatus.ACTIVE) ||
            (action === 'reject' && userToUpdate.status === UserStatus.INACTIVE)
        ) {
            return NextResponse.json({
                message: `User is already ${action === 'approve' ? 'approved' : 'rejected'}`
            });
        }

        // Update user status
        // Using type assertion to handle potential schema/type mismatch
        const updatedUser = await tenantPrisma.client.user.update({
            where: {id},
            data: {
                // @ts-ignore - status field exists in the schema but TypeScript doesn't recognize it
                status: action === 'approve' ? UserStatus.ACTIVE : UserStatus.INACTIVE
            }
        }) as unknown as {
            id: string;
            email: string;
            username: string;
            role: string;
            status: UserStatus;
            customerId?: string;
        };

        // TODO: Send email notification to user about approval/rejection
        console.log(`User ${updatedUser.email} has been ${action === 'approve' ? 'approved' : 'rejected'}`);

        // In a real implementation, we would send an email here
        // For now, we'll just log it

        return NextResponse.json({
            message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            user: updatedUser
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors
                },
                {status: 400}
            );
        }

        console.error('User approval error:', error);
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}, {requiredRole: 'ADMIN'}); // Only ADMIN or higher can access this endpoint
