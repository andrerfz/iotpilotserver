import {NextResponse} from 'next/server';
import {z} from 'zod';
import {DomainException} from '@/lib/shared/domain/exceptions/domain.exception';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';
import {NodeCryptoService} from '../crypto/node-crypto.service';
import {ApiResponse} from './api-response.util';

// Default crypto service instance for utility functions
const defaultCryptoService = new NodeCryptoService();

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
    error: string;
    code?: string;
    details?: any;
    timestamp: string;
    correlationId?: string;
}

/**
 * HTTP status codes for different error types
 */
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503
}

/**
 * Map error types to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<string, number> = {
    // Domain Exceptions
    'ValidationException': HttpStatus.BAD_REQUEST,
    'InvalidInputException': HttpStatus.BAD_REQUEST,
    'NotFoundException': HttpStatus.NOT_FOUND,
    'DeviceNotFoundException': HttpStatus.NOT_FOUND,
    'UserNotFoundException': HttpStatus.NOT_FOUND,
    'CustomerNotFoundException': HttpStatus.NOT_FOUND,
    'ApiKeyNotFoundException': HttpStatus.NOT_FOUND,
    'AlertNotFoundException': HttpStatus.NOT_FOUND,
    'UnauthorizedException': HttpStatus.UNAUTHORIZED,
    'ForbiddenException': HttpStatus.FORBIDDEN,
    'TenantAccessDeniedException': HttpStatus.FORBIDDEN,
    'ConflictException': HttpStatus.CONFLICT,
    'DuplicateEntityException': HttpStatus.CONFLICT,
    'ApiKeyLimitExceededException': HttpStatus.UNPROCESSABLE_ENTITY,
    'RateLimitExceededException': HttpStatus.TOO_MANY_REQUESTS,
    // Zod validation
    'ZodError': HttpStatus.BAD_REQUEST,
};

/**
 * Get HTTP status code for an error
 */
function getStatusCodeForError(error: unknown): number {
    if (error instanceof z.ZodError) {
        return HttpStatus.BAD_REQUEST;
    }

    if (error instanceof Error) {
        const errorName = error.constructor.name;
        if (errorName in ERROR_STATUS_MAP) {
            return ERROR_STATUS_MAP[errorName];
        }

        // Check error message patterns
        const message = error.message.toLowerCase();
        if (message.includes('not found')) {
            return HttpStatus.NOT_FOUND;
        }
        if (message.includes('unauthorized') || message.includes('invalid credentials')) {
            return HttpStatus.UNAUTHORIZED;
        }
        if (message.includes('forbidden') || message.includes('access denied') || message.includes('belongs to another')) {
            return HttpStatus.FORBIDDEN;
        }
        if (message.includes('already exists') || message.includes('duplicate')) {
            return HttpStatus.CONFLICT;
        }
        if (message.includes('invalid') || message.includes('required')) {
            return HttpStatus.BAD_REQUEST;
        }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Extract error details safely
 */
function extractErrorDetails(error: unknown): { message: string; code?: string; details?: any } {
    if (error instanceof z.ZodError) {
        return {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code
            }))
        };
    }

    if (error instanceof DomainException) {
        return {
            message: error.message,
            code: error.code,
            details: error.details
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            code: error.constructor.name.replace('Exception', '').toUpperCase()
        };
    }

    return {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
    };
}

/**
 * Standard error handler for API routes
 * Provides consistent error responses and logging
 */
export function handleApiError(
    error: unknown,
    context?: {
        endpoint?: string;
        userId?: string;
        customerId?: string;
        correlationId?: string;
    },
    cryptoService: CryptoService = defaultCryptoService
): NextResponse<ApiErrorResponse> {
    const statusCode = getStatusCodeForError(error);
    const errorDetails = extractErrorDetails(error);
    const correlationId = context?.correlationId || cryptoService.randomUUID();

    // Log the error with context
    const logContext = {
        endpoint: context?.endpoint,
        userId: context?.userId,
        customerId: context?.customerId,
        correlationId,
        errorCode: errorDetails.code,
        statusCode
    };

    if (statusCode >= 500) {
        logger.error(errorDetails.message, error instanceof Error ? error : undefined, logContext);
    } else if (statusCode >= 400) {
        logger.warn(errorDetails.message, logContext);
    }

    // Return standardized error response
    return ApiResponse.error(errorDetails.message, statusCode, {
        code: errorDetails.code,
        details: errorDetails.details,
        correlationId
    }) as NextResponse<ApiErrorResponse>;
}

/**
 * Create a success response with standard structure
 */
export function createSuccessResponse<T>(
    data: T,
    statusCode: number = HttpStatus.OK,
    meta?: { correlationId?: string; pagination?: any }
): NextResponse {
    return ApiResponse.success(data, statusCode, {
        correlationId: meta?.correlationId,
        pagination: meta?.pagination,
        meta: meta ? { ...meta, correlationId: undefined, pagination: undefined } : undefined
    });
}

/**
 * Create a created response (201)
 */
export function createCreatedResponse<T>(
    data: T,
    meta?: { correlationId?: string }
): NextResponse {
    return createSuccessResponse(data, HttpStatus.CREATED, meta);
}

/**
 * Wrapper for async route handlers with automatic error handling
 */
export function withErrorHandling(
    handler: (request: Request, context?: any) => Promise<NextResponse>,
    endpointName?: string,
    cryptoService: CryptoService = defaultCryptoService
) {
    return async (request: Request, context?: any): Promise<NextResponse> => {
        const correlationId = request.headers.get('x-correlation-id') || cryptoService.randomUUID();

        try {
            return await handler(request, context);
        } catch (error) {
            return handleApiError(error, {
                endpoint: endpointName,
                correlationId
            });
        }
    };
}

