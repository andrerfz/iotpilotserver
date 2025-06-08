import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { 
    hasRole, 
    isAdmin, 
    isSuperAdmin, 
    sessionHasRole, 
    sessionIsAdmin, 
    sessionIsSuperAdmin 
} from './permissions';

const prisma = new PrismaClient();

export interface AuthPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export function verifyToken(token: string): AuthPayload | null {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        return payload;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

export function extractToken(request: NextRequest): string | null {
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

// Simplified authenticate that only verifies JWT (for API routes)
export async function authenticate(request: NextRequest) {
    const token = extractToken(request);

    if (!token) {
        return { user: null, error: 'No token provided' };
    }

    const payload = verifyToken(token);
    if (!payload) {
        return { user: null, error: 'Invalid token' };
    }

    // Check session is still valid in database
    try {
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                        customerId: true
                    }
                }
            }
        });

        if (!session) {
            return { user: null, error: 'Session expired' };
        }

        return { user: session.user, error: null };
    } catch (error) {
        console.error('Database authentication check failed:', error);
        return { user: null, error: 'Authentication error' };
    }
}

export function requireAuth(requiredRole?: UserRole) {
    return async (request: NextRequest) => {
        const { user, error } = await authenticate(request);

        if (error || !user) {
            return { authorized: false, user: null, error: error || 'Unauthorized' };
        }

        // Check role if specified
        if (requiredRole) {
            const roleHierarchy = { READONLY: 0, USER: 1, ADMIN: 2, SUPERADMIN: 3};
            const userLevel = roleHierarchy[user.role];
            const requiredLevel = roleHierarchy[requiredRole];

            if (userLevel < requiredLevel) {
                return { authorized: false, user, error: 'Insufficient permissions' };
            }
        }

        return { authorized: true, user, error: null };
    };
}

export async function validateApiKey(apiKey: string) {
    try {
        const key = await prisma.apiKey.findFirst({
            where: {
                key: apiKey,
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
                        customerId: true
                    }
                }
            }
        });

        if (key) {
            // Update last used (don't await to avoid blocking)
            prisma.apiKey.update({
                where: { id: key.id },
                data: { lastUsed: new Date() }
            }).catch(err => console.error('Failed to update API key last used:', err));

            return { valid: true, user: key.user };
        }

        return { valid: false, user: null };
    } catch (error) {
        console.error('API key validation error:', error);
        return { valid: false, user: null };
    }
}

// Get server session for server components
export async function getServerSession() {
    // This is a simplified implementation - in a real app, you would use
    // the next-auth getServerSession or a similar mechanism
    try {
        // Get the session cookie from the request
        const cookies = require('next/headers').cookies;
        const token = cookies().get('auth-token')?.value;

        if (!token) {
            return null;
        }

        const payload = verifyToken(token);
        if (!payload) {
            return null;
        }

        // Check if session is valid in database
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                        customerId: true
                    }
                }
            }
        });

        if (!session) {
            return null;
        }

        // Return session with user data
        return {
            user: session.user,
            role: session.user.role,
            userId: session.user.id,
            customerId: session.user.customerId || 'default' // Fallback to 'default' if not set
        };
    } catch (error) {
        console.error('Error getting server session:', error);
        return null;
    }
}

// Re-export permission service functions
export {
    hasRole,
    isAdmin,
    isSuperAdmin,
    sessionHasRole,
    sessionIsAdmin,
    sessionIsSuperAdmin
};
