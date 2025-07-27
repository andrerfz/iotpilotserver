import {NextRequest, NextResponse} from 'next/server';
import {ValidateSessionQuery} from '@/lib/user/application/queries/validate-session/validate-session.query';
import {InMemoryQueryBus} from '@/lib/shared/application/bus/query.bus';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiResponse} from '../http/api-response.util';

/**
 * Authenticated request with user information
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    customerId: string | null;
  };
  session?: {
    id: string;
    expiresAt: Date;
  };
  tenantContext?: TenantContext;
}

/**
 * Authentication middleware using DDD ValidateSession query
 */
export async function withAuth(
  request: NextRequest,
  queryBus: InMemoryQueryBus
): Promise<{ authenticated: boolean; request: AuthenticatedRequest; response?: NextResponse }> {
  try {
    // Extract token from request
    const cookieToken = request.cookies.get('auth-token')?.value;
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const token = cookieToken || bearerToken;

    process.stdout.write(`🔍 Auth middleware: cookieToken=${cookieToken}, bearerToken=${bearerToken}, finalToken=${token}\n`);

    if (!token) {
      process.stdout.write(`🔍 Auth middleware: No token found\n`);
      return {
        authenticated: false,
        request: request as AuthenticatedRequest,
        response: ApiResponse.unauthorized('No authentication token provided')
      };
    }

    // Validate session using DDD query
    process.stdout.write(`🔍 Auth middleware: Creating ValidateSessionQuery with token: ${token}\n`);
    const query = ValidateSessionQuery.create(token);
    process.stdout.write(`🔍 Auth middleware: Executing query via queryBus\n`);
    const validationResult = await queryBus.execute(query);
    process.stdout.write(`🔍 Auth middleware: Query result: valid=${validationResult.valid}\n`);

    if (!validationResult.valid || !validationResult.user) {
      return {
        authenticated: false,
        request: request as AuthenticatedRequest,
        response: ApiResponse.unauthorized('Invalid or expired session')
      };
    }

    // Create tenant context
    const tenantContext = validationResult.user.customerId
      ? TenantContextImpl.create(CustomerId.create(validationResult.user.customerId))
      : TenantContextImpl.createSuperAdmin();

    // Enhance request with user information
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = validationResult.user;
    authenticatedRequest.session = validationResult.session;
    authenticatedRequest.tenantContext = tenantContext;

    return {
      authenticated: true,
      request: authenticatedRequest
    };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    process.stdout.write(`❌ Auth middleware exception: ${(error as any)?.message}\n`);
    process.stdout.write(`❌ Auth middleware stack: ${(error as any)?.stack}\n`);
    return {
      authenticated: false,
      request: request as AuthenticatedRequest,
      response: ApiResponse.internalError('Authentication failed')
    };
  }
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuthMiddleware(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  queryBus: InMemoryQueryBus
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await withAuth(request, queryBus);
    
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    return handler(authResult.request);
  };
}

/**
 * Role-based access control middleware
 */
export function withRole(allowedRoles: string[]) {
  return (request: AuthenticatedRequest): boolean => {
    if (!request.user) {
      return false;
    }

    // SUPERADMIN has access to everything
    if (request.user.role === 'SUPERADMIN') {
      return true;
    }

    return allowedRoles.includes(request.user.role);
  };
}

/**
 * Tenant access control middleware
 */
export function withTenantAccess(requiredCustomerId?: string) {
  return (request: AuthenticatedRequest): boolean => {
    if (!request.user) {
      return false;
    }

    // SUPERADMIN can access any tenant
    if (request.user.role === 'SUPERADMIN') {
      return true;
    }

    // If no specific customer is required, user just needs to belong to a customer
    if (!requiredCustomerId) {
      return !!request.user.customerId;
    }

    // Check if user belongs to the required customer
    return request.user.customerId === requiredCustomerId;
  };
}