// app/src/app/api/auth/refresh/route.ts
import {NextRequest} from 'next/server';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {RefreshSessionCommand} from '@/lib/user/application/commands/refresh-session/refresh-session.command';
import {RefreshSessionResult} from '@/lib/user/application/commands/refresh-session/refresh-session.handler';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Validation schema for refresh request
const v = validator();
const refreshSchema = v.object({
    refreshToken: v.optional(v.string()), // Can be in body or cookie
    remember: v.optional(v.boolean())
});

// POST /api/auth/refresh - Refresh session token using DDD architecture
export async function POST(request: NextRequest) {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 AUTH REFRESH: Starting token refresh with DDD architecture');
        }

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json().catch(() => ({}));
        const { refreshToken: bodyRefreshToken, remember } = refreshSchema.parse(body);

        // Extract refresh token from body, cookie, or Authorization header
        const refreshToken = bodyRefreshToken ||
            request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!refreshToken) {
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ AUTH REFRESH: No refresh token provided');
            }
            return ApiResponse.unauthorized('No refresh token provided');
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('📋 AUTH REFRESH: Refreshing session token');
        }

        // Create tenant context (will be determined from the token)
        const tenantContext = TenantContextImpl.createSuperAdmin();

        // Create and execute RefreshSession command
        const refreshSessionCommand = RefreshSessionCommand.create(
            refreshToken,
            undefined, // tenantCustomerId will be determined from session
            tenantContext
        );

        const refreshResult: RefreshSessionResult = await commandBus.execute(refreshSessionCommand);

        if (process.env.NODE_ENV === 'development') {
            console.log('✅ AUTH REFRESH: Token refreshed successfully:', {
                userId: refreshResult.user.id,
                email: refreshResult.user.email,
                role: refreshResult.user.role,
                customerId: refreshResult.user.customerId
            });
        }

        // Create response
        const response = ApiResponse.ok({
            message: 'Token refreshed successfully',
            user: {
                id: refreshResult.user.id,
                email: refreshResult.user.email,
                username: refreshResult.user.username,
                role: refreshResult.user.role,
                customerId: refreshResult.user.customerId
            },
            token: refreshResult.token,
            refreshed: true
        });

        // Set new token in cookie
        response.cookies.set('auth-token', refreshResult.token, {
            httpOnly: true,
            secure: false, // Set to false for local HTTP
            sameSite: 'lax',
            maxAge: remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days if remember, 24 hours otherwise
            path: '/'
        });

        return response;

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ AUTH REFRESH: Failed to refresh token with DDD:', error);
        }
        
        if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
            return ApiResponse.badRequest('Invalid refresh request', (error as any).errors);
        }

        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Invalid or expired refresh token')) {
                // Clear the invalid token cookie
                const response = ApiResponse.unauthorized('Invalid or expired refresh token');
                
                response.cookies.set('auth-token', '', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 0,
                    path: '/'
                });
                
                return response;
            }
            if (error.message.includes('Session not found') || 
                error.message.includes('Session expired')) {
                // Clear the invalid token cookie
                const response = ApiResponse.unauthorized('Session expired or not found');
                
                response.cookies.set('auth-token', '', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 0,
                    path: '/'
                });
                
                return response;
            }
            if (error.message.includes('User not found')) {
                return ApiResponse.notFound('User associated with session not found');
            }
        }

        return ApiResponse.internalError('Failed to refresh token');
    }
}