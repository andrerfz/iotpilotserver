import {NextRequest, NextResponse} from 'next/server';
import {authenticate, validateApiKey} from '../authentication/auth.service';
import {withTenant} from '@/lib/tenant-middleware';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserRole, UserRoleType} from '@/lib/shared/domain/value-objects/user-role.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {StructuredLogger} from '../logging/structured-logger';
import {ApiResponse} from '../http/api-response.util';

const logger = StructuredLogger.forService('api-middleware');

export interface AuthenticatedRequest extends NextRequest {
    user?: {
        id: string;
        email: string;
        username: string;
        role: UserRoleType;
        customerId?: string | null;
    };
    tenant?: TenantContext;
}

/**
 * Authentication middleware for API routes
 * Supports both JWT and API key authentication
 */
export function withAuth(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
    options?: {
        requiredRole?: UserRoleType;
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
                    return ApiResponse.unauthorized(error || 'Authentication required');
                }

                user = jwtUser;
            }

            // Get customer context from headers if available
            const customerIdHeader = request.headers.get('x-customer-id');
            if (customerIdHeader && !user.customerId) {
                // Only allow setting customer context from header for SUPERADMIN
                if (user.role === 'SUPERADMIN') {
                    user.customerId = customerIdHeader;
                }
            }

            // Check role requirements using UserRole value object
            if (options?.requiredRole) {
                const userRole = UserRole.fromString(user.role);
                if (!userRole.hasRole(options.requiredRole)) {
                    return ApiResponse.forbidden('Insufficient permissions');
                }
            }

            // Add user to request
            (request as AuthenticatedRequest).user = user;

            return await handler(request as AuthenticatedRequest);

        } catch (error) {
            logger.error('Auth middleware error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                url: request.url
            }, error instanceof Error ? error : new Error(String(error)));
            return ApiResponse.internalError('Internal server error');
        }
    };
}

export function requireRole(role: UserRoleType) {
    return { requiredRole: role };
}

export function allowApiKey() {
    return { allowApiKey: true };
}

/**
 * Middleware that adds tenant context to authenticated requests
 */
export function withCustomerContext(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
    options?: {
        requiredRole?: UserRoleType;
        allowApiKey?: boolean;
    }
) {
    // First authenticate the user
    const authHandler = withAuth(async (request: NextRequest) => {
        const authRequest = request as AuthenticatedRequest;
        
        if (!authRequest.user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        const user = authRequest.user;
        const isSuperAdmin = user.role === 'SUPERADMIN';

        // Convert to value objects
        const customerId = user.customerId ? CustomerId.fromString(user.customerId) : null;
        const userId = UserId.fromString(user.id);
        const userRole = UserRole.fromString(user.role);

        // Create tenant context
        const tenantContext: TenantContext = TenantContextImpl.createFromRequest(
            customerId,
            userId,
            userRole,
            `req-${Date.now()}`,
            `req-${request.url}`,
            request.headers.get('user-agent') || undefined,
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
        );

        // Validate tenant context
        if (!isSuperAdmin && !tenantContext.getCustomerId()) {
            return ApiResponse.badRequest('Missing customer context');
        }

        // Create enriched request with tenant context
        const enrichedRequest: AuthenticatedRequest = Object.assign(authRequest, {
            tenant: tenantContext
        });

        // Run the handler with tenant context
        return await withTenant(tenantContext, () => handler(enrichedRequest));
    }, options);

    return authHandler;
}

