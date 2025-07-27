// app/src/lib/shared/infrastructure/middleware/rate-limiting.middleware.ts
import {NextRequest, NextResponse} from 'next/server';
import {AuthenticatedRequest} from './auth-middleware';
import {ApiResponse} from '../http/api-response.util';

export interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    max: number; // Maximum requests per window
    keyGenerator?: (request: NextRequest | AuthenticatedRequest) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    message?: string;
    statusCode?: number;
    headers?: boolean;
    resetTime?: boolean;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

// In-memory store for rate limit data (in production, use Redis or similar)
class MemoryStore {
    private store = new Map<string, { count: number; resetTime: number }>();

    get(key: string): { count: number; resetTime: number } | undefined {
        const entry = this.store.get(key);
        if (entry && entry.resetTime > Date.now()) {
            return entry;
        }
        if (entry) {
            this.store.delete(key);
        }
        return undefined;
    }

    set(key: string, count: number, resetTime: number): void {
        this.store.set(key, { count, resetTime });
    }

    increment(key: string, windowMs: number): { count: number; resetTime: number } {
        const now = Date.now();
        const entry = this.get(key);
        
        if (entry) {
            entry.count += 1;
            this.store.set(key, entry);
            return entry;
        }
        
        const resetTime = now + windowMs;
        const newEntry = { count: 1, resetTime };
        this.store.set(key, newEntry);
        return newEntry;
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetTime <= now) {
                this.store.delete(key);
            }
        }
    }
}

const store = new MemoryStore();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    store.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for DDD architecture
 * Protects API endpoints from abuse and implements fair usage
 */
export function withRateLimit(
    handler: (request: NextRequest | AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>,
    options: RateLimitOptions
) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        max = 100, // 100 requests per window default
        keyGenerator = defaultKeyGenerator,
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        message = 'Too many requests, please try again later',
        statusCode = 429,
        headers = true,
        resetTime = true
    } = options;

    return async (request: NextRequest | AuthenticatedRequest, ...args: any[]): Promise<NextResponse> => {
        const key = keyGenerator(request);
        const entry = store.increment(key, windowMs);
        
        const rateLimitInfo: RateLimitInfo = {
            limit: max,
            remaining: Math.max(0, max - entry.count),
            resetTime: entry.resetTime,
            retryAfter: entry.count > max ? Math.ceil((entry.resetTime - Date.now()) / 1000) : undefined
        };

        // Check if rate limit is exceeded
        if (entry.count > max) {
            const response = ApiResponse.tooManyRequests(message, {
                rateLimitInfo: {
                    limit: rateLimitInfo.limit,
                    remaining: rateLimitInfo.remaining,
                    resetTime: new Date(rateLimitInfo.resetTime).toISOString(),
                    retryAfter: rateLimitInfo.retryAfter
                }
            });

            if (headers) {
                addRateLimitHeaders(response, rateLimitInfo);
            }

            return response;
        }

        // Execute the handler
        let response: NextResponse;
        let requestSuccessful = false;

        try {
            response = await handler(request, ...args);
            requestSuccessful = response.status < 400;
        } catch (error) {
            // Create error response
            response = ApiResponse.internalError('Internal server error');
            requestSuccessful = false;
        }

        // Adjust count based on skip options
        if ((skipSuccessfulRequests && requestSuccessful) || 
            (skipFailedRequests && !requestSuccessful)) {
            // Decrement the count since we're skipping this request
            const currentEntry = store.get(key);
            if (currentEntry && currentEntry.count > 0) {
                store.set(key, currentEntry.count - 1, currentEntry.resetTime);
                rateLimitInfo.remaining = Math.max(0, max - (currentEntry.count - 1));
            }
        }

        // Add rate limit headers to successful responses
        if (headers) {
            addRateLimitHeaders(response, rateLimitInfo);
        }

        return response;
    };
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(response: NextResponse, rateLimitInfo: RateLimitInfo): void {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitInfo.resetTime).toISOString());
    
    if (rateLimitInfo.retryAfter) {
        response.headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
    }
}

/**
 * Default key generator - uses IP address and user ID if available
 */
function defaultKeyGenerator(request: NextRequest | AuthenticatedRequest): string {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.id;
    const ip = getClientIp(request);
    
    if (userId) {
        return `user:${userId}`;
    }
    
    return `ip:${ip}`;
}

/**
 * Key generator based on user ID and customer ID
 */
export function userBasedKeyGenerator(request: NextRequest | AuthenticatedRequest): string {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.id;
    const customerId = authRequest.user?.customerId;
    
    if (userId && customerId) {
        return `user:${userId}:customer:${customerId}`;
    }
    
    if (userId) {
        return `user:${userId}`;
    }
    
    return defaultKeyGenerator(request);
}

/**
 * Key generator based on API key
 */
export function apiKeyBasedKeyGenerator(request: NextRequest | AuthenticatedRequest): string {
    const apiKey = request.headers.get('x-api-key') || 
                  request.headers.get('authorization')?.replace('ApiKey ', '');
    
    if (apiKey) {
        // Use a hash of the API key for security
        return `apikey:${hashApiKey(apiKey)}`;
    }
    
    return defaultKeyGenerator(request);
}

/**
 * Key generator for specific endpoints
 */
export function endpointBasedKeyGenerator(request: NextRequest | AuthenticatedRequest): string {
    const url = new URL(request.url);
    const baseKey = defaultKeyGenerator(request);
    return `${baseKey}:${request.method}:${url.pathname}`;
}

/**
 * Extract client IP address
 */
function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    
    return request.headers.get('x-real-ip') || 
           request.headers.get('x-forwarded-host') || 
           'unknown';
}

/**
 * Simple hash function for API keys (for privacy)
 */
function hashApiKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
        const char = apiKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
    // Very strict for sensitive operations
    strict: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 requests per 15 minutes
        message: 'Too many requests for this sensitive operation'
    },
    
    // Standard rate limit for most API endpoints
    standard: {
        windowMs: 15 * 60 * 1000, // 15 minutes  
        max: 100, // 100 requests per 15 minutes
        message: 'Too many requests, please try again later'
    },
    
    // Generous for high-frequency operations
    generous: {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 60 requests per minute
        message: 'Rate limit exceeded'
    },
    
    // Special limits for authentication
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 login attempts per 15 minutes
        message: 'Too many authentication attempts, please try again later',
        keyGenerator: endpointBasedKeyGenerator,
        skipSuccessfulRequests: true
    },
    
    // Device registration limits
    deviceRegistration: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 device registrations per hour
        message: 'Too many device registrations, please try again later',
        keyGenerator: userBasedKeyGenerator
    },
    
    // API key based limits (higher for authenticated requests)
    apiKey: {
        windowMs: 60 * 1000, // 1 minute
        max: 120, // 120 requests per minute for API key users
        message: 'API key rate limit exceeded',
        keyGenerator: apiKeyBasedKeyGenerator
    }
};

/**
 * Utility functions for common rate limiting scenarios
 */
export function createRateLimitedHandler(
    handler: (request: NextRequest | AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>,
    config: keyof typeof rateLimitConfigs
) {
    return withRateLimit(handler, rateLimitConfigs[config]);
}

/**
 * Middleware factory for different rate limiting strategies
 */
export function createCustomRateLimit(options: Partial<RateLimitOptions>) {
    const defaultOptions: RateLimitOptions = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later'
    };
    
    return (handler: (request: NextRequest | AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>) => {
        return withRateLimit(handler, { ...defaultOptions, ...options });
    };
}