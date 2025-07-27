import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Define UserStatus enum values directly since there's an issue with importing from @prisma/client
enum UserStatus {
    ACTIVE = 'ACTIVE',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED',
    INACTIVE = 'INACTIVE'
}

// Validation schema for approval action
const v = validator();
const approvalSchema = v.object({
    action: v.enum(['approve', 'reject'] as const),
    reason: v.optional(v.string())
});

// Handler for approving or rejecting a user
export const POST = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        // Get user ID from URL
        const url = (request as any).url || (request as any).nextUrl?.href || '';
        const id = url.split('/').pop()?.split('/')[0];
        if (!id) {
            return ApiResponse.badRequest('User ID is required');
        }

        // Parse request body
        const body = await (request as any).json();
        const {
            action,
            reason
        } = approvalSchema.parse(body);

        // Get current user context
        const currentUser = request.user;
        if (!currentUser) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Only ADMIN or SUPERADMIN can approve/reject users
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
            return ApiResponse.forbidden('Insufficient permissions');
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
            return ApiResponse.notFound('User not found');
        }

        // Check if user is already in the requested state
        if (
            (action === 'approve' && userToUpdate.status === UserStatus.ACTIVE) ||
            (action === 'reject' && userToUpdate.status === UserStatus.INACTIVE)
        ) {
            return ApiResponse.ok({
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

        return ApiResponse.ok({
            message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            user: updatedUser
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            return ApiResponse.badRequest('Invalid input', (error as any).errors);
        }

        console.error('User approval error:', error);
        return ApiResponse.internalError('Internal server error');
    }
}, {requiredRole: 'ADMIN'}); // Only ADMIN or higher can access this endpoint
