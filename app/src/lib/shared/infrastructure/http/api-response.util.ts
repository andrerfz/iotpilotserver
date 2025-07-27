/**
 * API Response Utility
 * 
 * Provides standardized response creation for API routes
 * Similar to Laravel's Response trait - ensures DRY principle
 * 
 * Usage:
 *   import { ApiResponse } from '@/lib/shared/infrastructure/http/api-response.util';
 *   
 *   return ApiResponse.error('Not found', 404);
 *   return ApiResponse.unauthorized('Session expired');
 *   return ApiResponse.success(data, 200);
 */

import {NextResponse} from 'next/server';
import {HttpStatus} from './error-handler';
import {PaginationMeta} from './pagination.util';

/**
 * Standard API response structure
 */
export interface StandardApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    details?: any;
    timestamp: string;
    correlationId?: string;
    meta?: {
        pagination?: PaginationMeta;
        [key: string]: any;
    };
}

/**
 * API Response utility class
 * Provides static methods for creating standardized responses
 */
export class ApiResponse {
    /**
     * Create a standardized error response
     */
    static error(
        message: string,
        status: number = HttpStatus.INTERNAL_SERVER_ERROR,
        options?: {
            code?: string;
            details?: any;
            correlationId?: string;
        }
    ): NextResponse<StandardApiResponse> {
        return NextResponse.json(
            {
                success: false,
                error: message,
                code: options?.code || this.getErrorCodeFromStatus(status),
                details: options?.details,
                timestamp: new Date().toISOString(),
                correlationId: options?.correlationId
            },
            { status }
        );
    }

    /**
     * Create a success response
     */
    static success<T>(
        data: T,
        status: number = HttpStatus.OK,
        options?: {
            correlationId?: string;
            meta?: Record<string, any>;
            pagination?: PaginationMeta;
        }
    ): NextResponse<StandardApiResponse<T>> {
        const response: StandardApiResponse<T> = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            correlationId: options?.correlationId
        };

        // Add pagination to meta if provided
        if (options?.pagination) {
            response.meta = {
                ...options.meta,
                pagination: options.pagination
            };
        } else if (options?.meta) {
            response.meta = options.meta;
        }

        return NextResponse.json(response, { status });
    }

    /**
     * 400 Bad Request
     */
    static badRequest(
        message: string = 'Bad request',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.BAD_REQUEST, {
            code: 'BAD_REQUEST',
            details,
            correlationId
        });
    }

    /**
     * 401 Unauthorized
     */
    static unauthorized(
        message: string = 'Authentication required',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.UNAUTHORIZED, {
            code: 'UNAUTHORIZED',
            details,
            correlationId
        });
    }

    /**
     * 403 Forbidden
     */
    static forbidden(
        message: string = 'Access denied',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.FORBIDDEN, {
            code: 'FORBIDDEN',
            details,
            correlationId
        });
    }

    /**
     * 404 Not Found
     */
    static notFound(
        message: string = 'Resource not found',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.NOT_FOUND, {
            code: 'NOT_FOUND',
            details,
            correlationId
        });
    }

    /**
     * 409 Conflict
     */
    static conflict(
        message: string = 'Resource conflict',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.CONFLICT, {
            code: 'CONFLICT',
            details,
            correlationId
        });
    }

    /**
     * 422 Unprocessable Entity
     */
    static unprocessableEntity(
        message: string = 'Validation failed',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.UNPROCESSABLE_ENTITY, {
            code: 'VALIDATION_ERROR',
            details,
            correlationId
        });
    }

    /**
     * 429 Too Many Requests
     */
    static tooManyRequests(
        message: string = 'Rate limit exceeded',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.TOO_MANY_REQUESTS, {
            code: 'RATE_LIMIT_EXCEEDED',
            details,
            correlationId
        });
    }

    /**
     * 500 Internal Server Error
     */
    static internalError(
        message: string = 'Internal server error',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.INTERNAL_SERVER_ERROR, {
            code: 'INTERNAL_ERROR',
            details,
            correlationId
        });
    }

    /**
     * 503 Service Unavailable
     */
    static serviceUnavailable(
        message: string = 'Service unavailable',
        details?: any,
        correlationId?: string
    ): NextResponse<StandardApiResponse> {
        return this.error(message, HttpStatus.SERVICE_UNAVAILABLE, {
            code: 'SERVICE_UNAVAILABLE',
            details,
            correlationId
        });
    }

    /**
     * 201 Created
     */
    static created<T>(
        data: T,
        correlationId?: string
    ): NextResponse<StandardApiResponse<T>> {
        return this.success(data, HttpStatus.CREATED, { correlationId });
    }

    /**
     * 200 OK
     */
    static ok<T>(
        data: T,
        correlationId?: string,
        meta?: Record<string, any> | { pagination?: PaginationMeta }
    ): NextResponse<StandardApiResponse<T>> {
        return this.success(data, HttpStatus.OK, { correlationId, ...(meta && { meta }) });
    }

    /**
     * 200 OK with pagination
     */
    static okPaginated<T>(
        data: T,
        pagination: PaginationMeta,
        correlationId?: string,
        additionalMeta?: Record<string, any>
    ): NextResponse<StandardApiResponse<T>> {
        return this.success(data, HttpStatus.OK, {
            correlationId,
            pagination,
            meta: additionalMeta
        });
    }

    /**
     * Get error code from HTTP status
     */
    private static getErrorCodeFromStatus(status: number): string {
        const statusCodeMap: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'VALIDATION_ERROR',
            429: 'RATE_LIMIT_EXCEEDED',
            500: 'INTERNAL_ERROR',
            503: 'SERVICE_UNAVAILABLE'
        };

        return statusCodeMap[status] || 'UNKNOWN_ERROR';
    }
}

