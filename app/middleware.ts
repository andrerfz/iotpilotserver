import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/api/devices/heartbeat', // Device heartbeat should use API key
    '/api/devices/register',  // Device registration should use API key
    '/login',
    '/register',
    '/terms',
    '/privacy',
    '/forgot-password'
];

// API routes that allow API key authentication (handled in route handlers)
const API_KEY_ROUTES = [
    '/api/devices/heartbeat',
    '/api/devices/register',
    '/api/devices/tailscale-register'
];

// Admin-only routes
const ADMIN_ROUTES = [
    '/admin',
    '/api/admin'
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and _next
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('.') ||
        pathname.startsWith('/static')
    ) {
        return NextResponse.next();
    }

    // Check if route is public
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // For API key routes, let the route handler validate the API key
    if (API_KEY_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Extract token from cookies or headers (don't read body)
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
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
        // Clear invalid token
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
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
                    { error: 'Admin access required' },
                    { status: 403 }
                );
            }

            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // Add user info to request headers for API routes (without reading body)
    if (pathname.startsWith('/api')) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.userId);
        requestHeaders.set('x-user-email', payload.email);
        requestHeaders.set('x-user-role', payload.role);

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