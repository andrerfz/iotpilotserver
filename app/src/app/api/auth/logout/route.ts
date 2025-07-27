import {NextRequest} from 'next/server';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// POST /api/auth/logout - Logout user using DDD architecture
export async function POST(request: NextRequest) {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const token = request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            // No token to logout, but that's fine - return success
            const response = ApiResponse.ok({ message: 'Logged out successfully' });
            
            response.cookies.set('auth-token', '', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 0,
                path: '/'
            });
            
            return response;
        }

        // Try to validate the session to get user information
        let user: any = null;
        let customerId: string | undefined = undefined;
        
        try {
            const queryBus = serviceContainer.getQueryBus();
            const { ValidateSessionQuery } = await import('@/lib/user/application/queries/validate-session/validate-session.query');
            
            const validateSessionQuery = ValidateSessionQuery.create(token);
            const sessionResult = await queryBus.execute(validateSessionQuery);
            
            if (sessionResult) {
                user = {
                    id: sessionResult.user.id,
                    email: sessionResult.user.email,
                    customerId: sessionResult.user.customerId
                };
                customerId = sessionResult.user.customerId;
            }
        } catch (error) {
            // Continue with logout even if session validation fails
        }

        // Create tenant context
        const tenantContext = customerId
            ? TenantContextImpl.create(CustomerId.create(customerId))
            : TenantContextImpl.createSuperAdmin();

        // Import LogoutUser command here to avoid circular imports
        const { LogoutUserCommand } = await import('@/lib/user/application/commands/logout-user/logout-user.command');

        // Create and execute LogoutUser command
        const logoutCommand = LogoutUserCommand.create(
            user?.id || 'unknown-user',
            token,
            customerId,
            tenantContext
        );

        await commandBus.execute(logoutCommand);

        // Create response
        const response = ApiResponse.ok({ message: 'Logged out successfully' });

        // Clear cookie without domain for local development
        response.cookies.set('auth-token', '', {
            httpOnly: true,
            secure: false, // Set to false for local HTTP
            sameSite: 'lax',
            maxAge: 0,
            path: '/'
        });

        return response;

    } catch (error) {
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found') || 
                error.message.includes('Session not found')) {
                // Even if session not found, consider logout successful
                const response = ApiResponse.ok({ message: 'Logged out successfully' });
                
                response.cookies.set('auth-token', '', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 0,
                    path: '/'
                });
                
                return response;
            }
        }

        return ApiResponse.internalError('Internal server error');
    }
}