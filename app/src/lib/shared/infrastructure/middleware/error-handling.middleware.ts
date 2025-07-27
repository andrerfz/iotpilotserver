// app/src/lib/shared/infrastructure/middleware/error-handling.middleware.ts
import {NextRequest, NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {ApiResponse} from '../http/api-response.util';

export interface ErrorResponse {
    error: string;
    code?: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
}

/**
 * Enhanced error handling middleware for DDD architecture
 * Provides consistent error responses across all API routes
 */
export function withErrorHandling<T extends any[], R extends NextResponse>(
    handler: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<NextResponse> => {
        try {
            return await handler(...args);
        } catch (error) {
            console.error('🚨 API Error:', error);

            // Extract request information from arguments
            const request = args.find(arg => arg && typeof arg === 'object' && arg.url) as NextRequest | undefined;
            const url = request ? new URL(request.url) : null;

            const errorResponse: ErrorResponse = {
                error: 'Internal server error',
                timestamp: new Date().toISOString(),
                path: url?.pathname || 'unknown',
                method: request?.method || 'unknown'
            };

            if (error instanceof ZodError) {
                return ApiResponse.badRequest('Validation failed', error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                    code: err.code
                })));
            }

            if (error instanceof Error) {
                const message = error.message.toLowerCase();

                // Domain-specific errors
                if (message.includes('not found')) {
                    return ApiResponse.notFound(error.message);
                }

                if (message.includes('already exists') || message.includes('duplicate')) {
                    return ApiResponse.conflict(error.message);
                }

                if (message.includes('unauthorized') || message.includes('invalid credentials')) {
                    return ApiResponse.unauthorized('Unauthorized');
                }

                if (message.includes('forbidden') || message.includes('access denied') || 
                    message.includes('tenant access violation')) {
                    return ApiResponse.forbidden('Access denied');
                }

                if (message.includes('validation') || message.includes('invalid')) {
                    return ApiResponse.badRequest(error.message);
                }

                if (message.includes('timeout')) {
                    return ApiResponse.error('Request timeout', 408, { code: 'TIMEOUT' });
                }

                if (message.includes('rate limit') || message.includes('too many requests')) {
                    return ApiResponse.tooManyRequests('Too many requests');
                }

                if (message.includes('service unavailable') || message.includes('connection')) {
                    return ApiResponse.serviceUnavailable('Service unavailable');
                }

                // Generic error with original message
                return ApiResponse.internalError(error.message);
            }

            // Fallback for unknown errors
            return ApiResponse.internalError('An unexpected error occurred');
        }
    };
}

/**
 * Utility function to create standardized error responses
 */
export function createErrorResponse(
    message: string,
    status: number,
    code?: string,
    details?: any,
    request?: NextRequest
): NextResponse {
    const url = request ? new URL(request.url) : null;
    
    const errorResponse: ErrorResponse = {
        error: message,
        code,
        details,
        timestamp: new Date().toISOString(),
        path: url?.pathname || 'unknown',
        method: request?.method || 'unknown'
    };

    return ApiResponse.error(message, status, {
        code,
        details
    });
}

/**
 * Domain exception handling for specific business logic errors
 */
export class DomainException extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 400,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'DomainException';
    }
}

export class NotFoundError extends DomainException {
    constructor(message: string, details?: any) {
        super(message, 'NOT_FOUND', 404, details);
    }
}

export class ValidationError extends DomainException {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

export class UnauthorizedError extends DomainException {
    constructor(message: string = 'Unauthorized', details?: any) {
        super(message, 'UNAUTHORIZED', 401, details);
    }
}

export class ForbiddenError extends DomainException {
    constructor(message: string = 'Access denied', details?: any) {
        super(message, 'FORBIDDEN', 403, details);
    }
}

export class ConflictError extends DomainException {
    constructor(message: string, details?: any) {
        super(message, 'CONFLICT', 409, details);
    }
}