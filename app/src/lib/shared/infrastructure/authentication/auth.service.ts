import jwt from 'jsonwebtoken';
import {NextRequest} from 'next/server';
import {UserRole, UserRoleType} from '@/lib/shared/domain/value-objects/user-role.vo';
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

/**
 * Authentication Service
 * Infrastructure service for JWT token verification, session management, and API key validation.
 * This service provides authentication utilities for API routes and server components.
 */
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

    /**
     * Verify JWT token
     */
    verifyToken(token: string): AuthPayload | null {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
            return payload;
        } catch (error) {
            this.logger.warn('Token verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                tokenLength: token.length,
                securityEvent: 'TOKEN_VERIFICATION_FAILED'
            });
            return null;
        }
    }

    /**
     * Extract token from request (cookie or Authorization header)
     */
    extractToken(request: NextRequest): string | null {
        // Try cookie first
        const cookieToken = request.cookies.get('auth-token')?.value;
        if (cookieToken) return cookieToken;

        // Try Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return null;
    }

    /**
     * Authenticate request using JWT token
     */
    async authenticate(request: NextRequest) {
        const token = this.extractToken(request);

        if (!token) {
            return { user: null, error: 'No token provided' };
        }

        const payload = this.verifyToken(token);
        if (!payload) {
            return { user: null, error: 'Invalid token' };
        }

        // Check session is still valid in database
        try {
            const session = await this.prisma.getClient().session.findFirst({
                where: {
                    token,
                    expiresAt: {
                        gt: new Date()
                    },
                    deletedAt: null // Exclude soft deleted sessions
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            role: true,
                            customerId: true,
                            deletedAt: true
                        }
                    }
                }
            });

            if (!session || session.user.deletedAt) {
                return { user: null, error: 'Session expired' };
            }

            return { user: session.user, error: null };
        } catch (error) {
            this.logger.error('Database authentication check failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            }, error instanceof Error ? error : new Error(String(error)));
            return { user: null, error: 'Authentication error' };
        }
    }

    /**
     * Validate API key
     */
    async validateApiKey(apiKey: string) {
        try {
            const key = await this.prisma.getClient().apiKey.findFirst({
                where: {
                    key: apiKey,
                    deletedAt: null, // Exclude soft deleted API keys
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            role: true,
                            customerId: true,
                            deletedAt: true
                        }
                    }
                }
            });

            if (key && !key.user.deletedAt) {
                // Update last used (don't await to avoid blocking)
                this.prisma.getClient().apiKey.update({
                    where: { id: key.id },
                    data: { lastUsed: new Date() }
                }).catch((err: unknown) => this.logger.error('Failed to update API key last used', {
                    error: err instanceof Error ? err.message : String(err)
                }, err instanceof Error ? err : new Error(String(err))));

                this.logger.info('API Key validation successful', {
                    keyId: key.id,
                    keyName: key.name,
                    userId: key.user.id,
                    userRole: key.user.role,
                    userCustomerId: key.user.customerId,
                    keyCustomerId: key.customerId
                });

                // Return the complete response with apiKeyRecord
                return {
                    valid: true,
                    user: key.user,
                    apiKeyRecord: {
                        id: key.id,
                        name: key.name,
                        customerId: key.customerId,
                        lastUsed: key.lastUsed,
                        expiresAt: key.expiresAt,
                        createdAt: key.createdAt
                    }
                };
            }

            this.logger.warn('API Key validation failed', {
                keyExists: !!key,
                userDeleted: key?.user?.deletedAt ? 'yes' : 'no'
            });

            return { valid: false, user: null, apiKeyRecord: null };
        } catch (error) {
            this.logger.error('API key validation error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            }, error instanceof Error ? error : new Error(String(error)));
            return { valid: false, user: null, apiKeyRecord: null };
        }
    }

    /**
     * Get server session for server components
     */
    async getServerSession() {
        try {
            // Get the session cookie from the request
            const cookies = require('next/headers').cookies;
            const token = cookies().get('auth-token')?.value;

            if (!token) {
                return null;
            }

            const payload = this.verifyToken(token);
            if (!payload) {
                return null;
            }

            // Check session is still valid in database
            const session = await this.prisma.getClient().session.findFirst({
                where: {
                    token,
                    expiresAt: {
                        gt: new Date()
                    },
                    deletedAt: null // Exclude soft deleted sessions
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            role: true,
                            customerId: true,
                            deletedAt: true
                        }
                    }
                }
            });

            if (!session || session.user.deletedAt) {
                return null;
            }

            return {
                userId: session.user.id,
                email: session.user.email,
                username: session.user.username,
                role: session.user.role,
                customerId: session.user.customerId
            };
        } catch (error) {
            this.logger.error('Server session check failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            }, error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    }

    /**
     * Require authentication with optional role check
     */
    requireAuth(requiredRole?: UserRoleType) {
        return async (request: NextRequest) => {
            const { user, error } = await this.authenticate(request);

            if (error || !user) {
                return { authorized: false, user: null, error: error || 'Unauthorized' };
            }

            // Check role if specified
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

// Export singleton instance
const authService = AuthenticationService.getInstance();

// Export convenience functions for backward compatibility
export const verifyToken = (token: string) => authService.verifyToken(token);
export const extractToken = (request: NextRequest) => authService.extractToken(request);
export const authenticate = (request: NextRequest) => authService.authenticate(request);
export const validateApiKey = (apiKey: string) => authService.validateApiKey(apiKey);
export const getServerSession = () => authService.getServerSession();
export const requireAuth = (requiredRole?: UserRoleType) => authService.requireAuth(requiredRole);

// Helper functions for role checking (DDD-aligned)
export function sessionHasRole(session: any | null, requiredRole: UserRoleType): boolean {
    if (!session) return false;
    const role = session.role || session.user?.role;
    if (!role) return false;
    const userRole = UserRole.fromString(role as UserRoleType);
    return userRole.hasRole(requiredRole);
}

export function sessionIsAdmin(session: any | null): boolean {
    if (!session) return false;
    const role = session.role || session.user?.role;
    if (!role) return false;
    const userRole = UserRole.fromString(role as UserRoleType);
    return userRole.hasRole('ADMIN');
}

export function sessionIsSuperAdmin(session: any | null): boolean {
    if (!session) return false;
    const role = session.role || session.user?.role;
    if (!role) return false;
    const userRole = UserRole.fromString(role as UserRoleType);
    return userRole.isSuperAdmin();
}

