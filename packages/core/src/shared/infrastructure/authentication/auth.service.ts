import jwt from 'jsonwebtoken';
import {UserRole, UserRoleType} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {StructuredLogger} from '../logging/structured-logger';
import {PrismaService} from '../database/prisma.service';
import {ServiceContainer} from '../container/service-container';

export interface AuthPayload {
    userId: string;
    email: string;
    role: UserRoleType;
    iat?: number;
    exp?: number;
}

// Duck-type interface compatible with both Next.js NextRequest and Express Request
export interface AuthenticatableRequest {
    cookies: Record<string, string | undefined> & { get?: (name: string) => { value: string } | undefined };
    headers: Record<string, string | string[] | undefined> & { get?: (name: string) => string | null };
}

export class AuthenticationService {
    private static instance: AuthenticationService;
    private readonly prisma: PrismaService;
    private readonly logger = StructuredLogger.forService('auth-service');

    private constructor() {
        this.prisma = ServiceContainer.getInstance().getPrismaClient();
    }

    static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    verifyToken(token: string): AuthPayload | null {
        try {
            return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        } catch (error) {
            this.logger.warn('Token verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                tokenLength: token.length,
                securityEvent: 'TOKEN_VERIFICATION_FAILED',
            });
            return null;
        }
    }

    extractToken(request: AuthenticatableRequest): string | null {
        // Support both Next.js cookies (.get()) and Express cookies (plain object)
        const cookieToken = typeof request.cookies.get === 'function'
            ? request.cookies.get('auth-token')?.value
            : (request.cookies as Record<string, string | undefined>)['auth-token'];
        if (cookieToken) return cookieToken;

        // Support both Next.js headers (.get()) and Express headers (plain object)
        const authHeader = typeof request.headers.get === 'function'
            ? request.headers.get('authorization')
            : (request.headers as Record<string, string | undefined>)['authorization'];
        if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);

        return null;
    }

    async authenticate(request: AuthenticatableRequest) {
        const token = this.extractToken(request);
        if (!token) return { user: null, error: 'No token provided' };

        const payload = this.verifyToken(token);
        if (!payload) return { user: null, error: 'Invalid token' };

        try {
            const session = await this.prisma.getClient().session.findFirst({
                where: { token, expiresAt: { gt: new Date() }, deletedAt: null },
                include: {
                    user: {
                        select: {
                            id: true, publicId: true, email: true, username: true,
                            role: true, customerId: true, deletedAt: true,
                        },
                    },
                },
            });

            if (!session || session.user.deletedAt) return { user: null, error: 'Session expired' };
            return { user: session.user, error: null };
        } catch (error) {
            this.logger.error('Database authentication check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            }, error instanceof Error ? error : new Error(String(error)));
            return { user: null, error: 'Authentication error' };
        }
    }

    async validateApiKey(apiKey: string) {
        try {
            const key = await this.prisma.getClient().apiKey.findFirst({
                where: {
                    key: apiKey,
                    deletedAt: null,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                include: {
                    user: {
                        select: {
                            id: true, publicId: true, email: true, username: true,
                            role: true, customerId: true, deletedAt: true,
                        },
                    },
                },
            });

            if (key && !key.user.deletedAt) {
                this.prisma.getClient().apiKey.update({
                    where: { id: key.id },
                    data: { lastUsed: new Date() },
                }).catch((err: unknown) => this.logger.error('Failed to update API key last used', {
                    error: err instanceof Error ? err.message : String(err),
                }, err instanceof Error ? err : new Error(String(err))));

                return {
                    valid: true,
                    user: key.user,
                    apiKeyRecord: {
                        id: key.id, name: key.name, customerId: key.customerId,
                        lastUsed: key.lastUsed, expiresAt: key.expiresAt, createdAt: key.createdAt,
                    },
                };
            }

            return { valid: false, user: null, apiKeyRecord: null };
        } catch (error) {
            this.logger.error('API key validation error', {
                error: error instanceof Error ? error.message : 'Unknown error',
            }, error instanceof Error ? error : new Error(String(error)));
            return { valid: false, user: null, apiKeyRecord: null };
        }
    }

    requireAuth(requiredRole?: UserRoleType) {
        return async (request: AuthenticatableRequest) => {
            const { user, error } = await this.authenticate(request);
            if (error || !user) return { authorized: false, user: null, error: error || 'Unauthorized' };

            if (requiredRole) {
                const userRole = UserRole.fromString(user.role as UserRoleType);
                if (!userRole.hasRole(requiredRole)) {
                    return { authorized: false, user, error: 'Insufficient permissions' };
                }
            }

            return { authorized: true, user, error: null };
        };
    }
}

const authService = AuthenticationService.getInstance();

export const verifyToken = (token: string) => authService.verifyToken(token);
export const extractToken = (request: AuthenticatableRequest) => authService.extractToken(request);
export const authenticate = (request: AuthenticatableRequest) => authService.authenticate(request);
export const validateApiKey = (apiKey: string) => authService.validateApiKey(apiKey);
export const requireAuth = (requiredRole?: UserRoleType) => authService.requireAuth(requiredRole);

export function sessionHasRole(session: any | null, requiredRole: UserRoleType): boolean {
    if (!session) return false;
    const role = session.role || session.user?.role;
    if (!role) return false;
    return UserRole.fromString(role as UserRoleType).hasRole(requiredRole);
}

export function sessionIsAdmin(session: any | null): boolean {
    return sessionHasRole(session, 'ADMIN');
}

export function sessionIsSuperAdmin(session: any | null): boolean {
    if (!session) return false;
    const role = session.role || session.user?.role;
    if (!role) return false;
    return UserRole.fromString(role as UserRoleType).isSuperAdmin();
}
