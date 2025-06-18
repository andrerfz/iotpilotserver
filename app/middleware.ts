import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {verifyToken} from '@/lib/auth';
import prisma from '@/lib/db';

// Public routes that don't require any authentication
const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/login',
    '/register',
    '/terms',
    '/privacy',
    '/forgot-password'
];

// API routes that accept EITHER JWT token OR API key (handled in route handlers)
const API_KEY_ROUTES = [
    '/api/devices/heartbeat',
    '/api/devices',
    '/api/devices/tailscale-register'
];

// Admin-only routes
const ADMIN_ROUTES = [
    '/admin',
    '/api/admin'
];

export async function middleware(request: NextRequest) {
    const {pathname} = request.nextUrl;

    // Skip middleware for static files and _next
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('.') ||
        pathname.startsWith('/static')
    ) {
        return NextResponse.next();
    }

    // Check if route is public - no authentication required
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // For API key routes, check if they have API key OR JWT token
    if (API_KEY_ROUTES.some(route => pathname.startsWith(route))) {
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '');

        const jwtToken = request.cookies.get('auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        // If they have API key, let route handler validate it
        if (apiKey) {
            return NextResponse.next();
        }

        // If they have JWT token, validate session in database (like /api/auth/me)
        if (jwtToken) {
            try {
                const session = await prisma.session.findFirst({
                    where: {
                        token: jwtToken,
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

                if (session) {
                    // Add user info to headers for the route handler
                    const requestHeaders = new Headers(request.headers);
                    requestHeaders.set('x-user-id', session.user.id);
                    requestHeaders.set('x-user-email', session.user.email);
                    requestHeaders.set('x-user-role', session.user.role);

                    // Add customer context if needed
                    if (session.user.customerId) {
                        requestHeaders.set('x-customer-id', session.user.customerId);
                    }

                    return NextResponse.next({
                        request: {
                            headers: requestHeaders,
                        },
                    });
                }
            } catch (error) {
                console.error('Session validation error:', error);
            }
        }

        // No valid API key or JWT token
        return NextResponse.json(
            {error: 'Authentication required - provide API key or JWT token'},
            {status: 401}
        );
    }

    // For all other routes, require JWT token
    const token = request.cookies.get('auth-token')?.value ||
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        // Redirect to login for web pages
        if (!pathname.startsWith('/api')) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Return 401 for API routes
        return NextResponse.json(
            {error: 'Authentication required'},
            {status: 401}
        );
    }

    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
        // Clear invalid token
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                {error: 'Invalid token'},
                {status: 401}
            );
        }

        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
    }

    // Check admin routes
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
        if (payload.role !== 'ADMIN') {
            if (pathname.startsWith('/api')) {
                return NextResponse.json(
                    {error: 'Admin access required'},
                    {status: 403}
                );
            }

            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // Add user info to request headers for API routes
    if (pathname.startsWith('/api')) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.userId);
        requestHeaders.set('x-user-email', payload.email);
        requestHeaders.set('x-user-role', payload.role);

        // Add customer context if needed
        if (!requestHeaders.has('x-customer-id')) {
            try {
                const user = await prisma.user.findUnique({
                    where: {id: payload.userId}
                });

                const userWithCustomerId = user as unknown as {
                    customerId?: string
                };
                if (userWithCustomerId?.customerId) {
                    requestHeaders.set('x-customer-id', userWithCustomerId.customerId);
                }
            } catch (error) {
                console.error('Error fetching customer context:', error);
            }
        }

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - static (static assets)
         */
        '/((?!_next/static|_next/image|favicon.ico|static).*)',
    ],
};