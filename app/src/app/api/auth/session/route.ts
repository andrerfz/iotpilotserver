import {NextRequest} from 'next/server';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {
    SessionValidationResult,
    ValidateSessionQuery
} from '@/lib/user/application/queries/validate-session/validate-session.query';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/auth/session - Validate current session using DDD architecture
export async function GET(request: NextRequest) {
    try {
        console.log('🔐 AUTH SESSION: Starting session validation with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract token from cookie or Authorization header
        const token = request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.log('❌ AUTH SESSION: No token provided');
            }
            return ApiResponse.unauthorized('No authentication token provided', { valid: false });
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('📋 AUTH SESSION: Validating session token');
        }

        // Create and execute ValidateSession query
        const validateSessionQuery = ValidateSessionQuery.create(token);
        const sessionResult: SessionValidationResult = await queryBus.execute(validateSessionQuery);

        if (!sessionResult.valid) {
            console.log('❌ AUTH SESSION: Session validation failed');
            return ApiResponse.unauthorized('Invalid or expired session', { valid: false });
        }

        console.log('✅ AUTH SESSION: Session validated successfully:', {
            userId: sessionResult.user?.id,
            email: sessionResult.user?.email,
            role: sessionResult.user?.role,
            customerId: sessionResult.user?.customerId
        });

        // Return session information
        const sessionData = {
            valid: true,
            user: {
                id: sessionResult.user!.id,
                email: sessionResult.user!.email,
                username: sessionResult.user!.username,
                role: sessionResult.user!.role,
                customerId: sessionResult.user!.customerId
            },
            session: {
                id: sessionResult.session!.id,
                expiresAt: sessionResult.session!.expiresAt
            }
        };

        return ApiResponse.ok(sessionData);

    } catch (error) {
        console.error('❌ AUTH SESSION: Failed to validate session with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Token is required')) {
                return ApiResponse.unauthorized('No authentication token provided', { valid: false });
            }
            if (error.message.includes('Session not found') || 
                error.message.includes('expired')) {
                return ApiResponse.unauthorized('Invalid or expired session', { valid: false });
            }
        }

        return ApiResponse.internalError('Failed to validate session', { valid: false });
    }
}