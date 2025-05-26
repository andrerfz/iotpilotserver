import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { authenticate, validateApiKey } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
    user?: {
        id: string;
        email: string;
        username: string;
        role: UserRole;
    };
}

export function withAuth(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
    options?: {
        requiredRole?: UserRole;
        allowApiKey?: boolean;
    }
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        try {
            let user = null;

            // Try API key authentication first if allowed
            if (options?.allowApiKey) {
                const apiKey = request.headers.get('x-api-key') ||
                    request.headers.get('authorization')?.replace('ApiKey ', '');

                if (apiKey) {
                    const { valid, user: apiUser } = await validateApiKey(apiKey);
                    if (valid && apiUser) {
                        user = apiUser;
                    }
                }
            }

            // Try JWT authentication if no API key or API key failed
            if (!user) {
                const { user: jwtUser, error } = await authenticate(request);

                if (error || !jwtUser) {
                    return NextResponse.json(
                        { error: error || 'Authentication required' },
                        { status: 401 }
                    );
                }

                user = jwtUser;
            }

            // Check role requirements
            if (options?.requiredRole) {
                const roleHierarchy = { READONLY: 0, USER: 1, ADMIN: 2 };
                const userLevel = roleHierarchy[user.role];
                const requiredLevel = roleHierarchy[options.requiredRole];

                if (userLevel < requiredLevel) {
                    return NextResponse.json(
                        { error: 'Insufficient permissions' },
                        { status: 403 }
                    );
                }
            }

            // Add user to request
            (request as AuthenticatedRequest).user = user;

            return await handler(request as AuthenticatedRequest);

        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}

export function requireRole(role: UserRole) {
    return { requiredRole: role };
}

export function allowApiKey() {
    return { allowApiKey: true };
}