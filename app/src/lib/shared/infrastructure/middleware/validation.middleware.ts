// app/src/lib/shared/infrastructure/middleware/validation.middleware.ts
import {NextRequest, NextResponse} from 'next/server';
import {z, ZodError, ZodSchema} from 'zod';
import {AuthenticatedRequest} from './auth-middleware';
import {Schema, ValidationService} from '@/lib/shared/domain/interfaces/validation-service.interface';
import {AppContainer} from '../container/app-container';
import {ApiResponse} from '../http/api-response.util';

// Backward compatibility: allow both Schema and ZodSchema
type SchemaOrZodSchema<T = any> = Schema<T> | ZodSchema<T>;

export interface ValidationOptions {
    body?: SchemaOrZodSchema;
    query?: SchemaOrZodSchema;
    params?: SchemaOrZodSchema;
    headers?: SchemaOrZodSchema;
    skipOnError?: boolean;
    customErrorHandler?: (errors: ZodError | { errors: ValidationError[] }) => NextResponse;
}

// Re-export ValidationError for convenience
export type ValidationError = {
    path: (string | number)[];
    message: string;
    code: string;
    received?: unknown;
};

export interface ValidatedRequest<
    TBody = any,
    TQuery = any,
    TParams = any,
    THeaders = any
> extends NextRequest {
    validatedBody?: TBody;
    validatedQuery?: TQuery;
    validatedParams?: TParams;
    validatedHeaders?: THeaders;
}

export interface ValidatedAuthenticatedRequest<
    TBody = any,
    TQuery = any,
    TParams = any,
    THeaders = any
> extends AuthenticatedRequest {
    validatedBody?: TBody;
    validatedQuery?: TQuery;
    validatedParams?: TParams;
    validatedHeaders?: THeaders;
}

/**
 * Validation middleware for DDD architecture
 * Provides comprehensive input validation using Zod schemas
 */
export function withValidation<
    TBody = any,
    TQuery = any,
    TParams = any,
    THeaders = any
>(
    handler: (
        request: ValidatedRequest<TBody, TQuery, TParams, THeaders> | 
                 ValidatedAuthenticatedRequest<TBody, TQuery, TParams, THeaders>,
        ...args: any[]
    ) => Promise<NextResponse>,
    options: ValidationOptions
) {
    return async (
        request: NextRequest | AuthenticatedRequest,
        ...args: any[]
    ): Promise<NextResponse> => {
        try {
            const validatedRequest = request as ValidatedRequest<TBody, TQuery, TParams, THeaders> | 
                                                   ValidatedAuthenticatedRequest<TBody, TQuery, TParams, THeaders>;
            
            // Get validation service (for Schema interface)
            const validationService = AppContainer.resolve<ValidationService>('ValidationService');

            // Validate request body
            if (options.body && request.method !== 'GET') {
                try {
                    const body = await request.json();
                    validatedRequest.validatedBody = parseWithSchema(options.body, body, validationService);
                } catch (error) {
                    if (error instanceof ZodError || isValidationError(error)) {
                        return handleValidationError(error, 'body', options.customErrorHandler);
                    }
                    // If JSON parsing fails, treat as validation error
                    return ApiResponse.badRequest('Invalid JSON in request body', undefined, undefined);
                }
            }

            // Validate query parameters
            if (options.query) {
                try {
                    const url = new URL(request.url);
                    const queryParams = Object.fromEntries(url.searchParams.entries());
                    validatedRequest.validatedQuery = parseWithSchema(options.query, queryParams, validationService);
                } catch (error) {
                    if (error instanceof ZodError || isValidationError(error)) {
                        return handleValidationError(error, 'query', options.customErrorHandler);
                    }
                }
            }

            // Validate route parameters
            if (options.params && args.length > 0) {
                try {
                    // Extract params from Next.js route context (usually second argument)
                    const context = args[0];
                    const params = context && context.params ? context.params : {};
                    validatedRequest.validatedParams = parseWithSchema(options.params, params, validationService);
                } catch (error) {
                    if (error instanceof ZodError || isValidationError(error)) {
                        return handleValidationError(error, 'params', options.customErrorHandler);
                    }
                }
            }

            // Validate headers
            if (options.headers) {
                try {
                    const headers = Object.fromEntries(request.headers.entries());
                    validatedRequest.validatedHeaders = parseWithSchema(options.headers, headers, validationService);
                } catch (error) {
                    if (error instanceof ZodError || isValidationError(error)) {
                        return handleValidationError(error, 'headers', options.customErrorHandler);
                    }
                }
            }

            // Execute the handler with validated data
            return await handler(validatedRequest, ...args);

        } catch (error) {
            if (options.skipOnError && !(error instanceof ZodError) && !isValidationError(error)) {
                // If skipOnError is true and it's not a validation error, continue
                return await handler(request as any, ...args);
            }
            
            if (error instanceof ZodError || isValidationError(error)) {
                return handleValidationError(error, 'unknown', options.customErrorHandler);
            }
            
            // Re-throw non-validation errors
            throw error;
        }
    };
}

/**
 * Helper to parse with either Schema or ZodSchema (backward compatibility)
 */
function parseWithSchema<T>(
    schema: SchemaOrZodSchema<T>,
    data: unknown,
    validationService: ValidationService
): T {
    // Check if it's a ZodSchema (has _def property) or our Schema interface
    if ('__zodSchema' in schema || '_def' in schema) {
        // It's a ZodSchema (either directly or wrapped)
        const zodSchema = (schema as any).__zodSchema || schema;
        return (zodSchema as ZodSchema<T>).parse(data);
    } else {
        // It's our Schema interface
        return (schema as Schema<T>).parse(data);
    }
}

/**
 * Check if error is a ValidationError
 */
function isValidationError(error: unknown): error is { errors: ValidationError[] } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'errors' in error &&
        Array.isArray((error as any).errors)
    );
}

/**
 * Handle validation errors and create standardized error responses
 */
function handleValidationError(
    error: ZodError | { errors: ValidationError[] },
    source: 'body' | 'query' | 'params' | 'headers' | 'unknown',
    customErrorHandler?: (errors: ZodError | { errors: ValidationError[] }) => NextResponse
): NextResponse {
    if (customErrorHandler) {
        return customErrorHandler(error);
    }

    let formattedErrors: Array<{
        field: string;
        message: string;
        code: string;
        received?: unknown;
    }>;

    if (error instanceof ZodError) {
        formattedErrors = error.errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: (err as any).received
        }));
    } else {
        formattedErrors = error.errors.map((err: ValidationError) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: err.received
        }));
    }

    return ApiResponse.badRequest(`Validation failed in ${source}`, formattedErrors);
}

/**
 * Common validation schemas for reuse across endpoints
 */
export const commonSchemas = {
    // Pagination parameters
    pagination: z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
        limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
    }),

    // Common ID parameters
    id: z.object({
        id: z.string().min(1, 'ID is required')
    }),

    // Device ID parameter
    deviceId: z.object({
        id: z.string().min(1, 'Device ID is required')
    }),

    // Customer ID header
    customerIdHeader: z.object({
        'x-customer-id': z.string().optional(),
        'x-target-customer-id': z.string().optional()
    }),

    // API Key header
    apiKeyHeader: z.object({
        'x-api-key': z.string().optional(),
        authorization: z.string().optional()
    }),

    // Date range query
    dateRange: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        period: z.enum(['1h', '6h', '24h', '7d', '30d']).optional()
    }),

    // Search and filter
    searchFilter: z.object({
        search: z.string().optional(),
        filter: z.string().optional(),
        status: z.string().optional()
    })
};

/**
 * Device-specific validation schemas
 */
export const deviceSchemas = {
    // Device registration body
    registration: z.object({
        device_id: z.string().min(1, 'Device ID is required'),
        hostname: z.string().min(1, 'Hostname is required'),
        device_type: z.enum(['raspberry-pi', 'ubuntu-server', 'windows-pc', 'custom']),
        device_model: z.string().optional(),
        architecture: z.string().optional(),
        location: z.string().optional(),
        ip_address: z.string().ip('Invalid IP address'),
        tailscale_ip: z.string().ip('Invalid Tailscale IP').optional(),
        mac_address: z.string().optional()
    }),

    // Device update body
    update: z.object({
        hostname: z.string().min(1).optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional()
    }),

    // SSH command body
    sshCommand: z.object({
        command: z.string().min(1, 'Command cannot be empty'),
        timeout: z.number().min(1000).max(300000).optional().default(30000)
    }),

    // Device metrics query
    metricsQuery: z.object({
        metric: z.string().optional().default('all'),
        period: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
        resolution: z.enum(['auto', 'raw', 'minute', 'hour', 'day']).optional().default('auto')
    })
};

/**
 * Authentication-specific validation schemas
 */
export const authSchemas = {
    // Login body
    login: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
        remember: z.boolean().optional()
    }),

    // Registration body
    registration: z.object({
        email: z.string().email('Invalid email address'),
        username: z.string().min(3, 'Username must be at least 3 characters').max(50),
        password: z.string()
            .min(12, 'Password must be at least 12 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/\d/, 'Password must contain at least one number')
            .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
    }),

    // Password reset
    passwordReset: z.object({
        email: z.string().email('Invalid email address')
    }),

    // Password change
    passwordChange: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string()
            .min(12, 'New password must be at least 12 characters')
            .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
            .regex(/\d/, 'New password must contain at least one number')
            .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'New password must contain at least one special character')
    })
};

/**
 * User management validation schemas
 */
export const userSchemas = {
    // User creation
    creation: z.object({
        email: z.string().email('Invalid email address'),
        username: z.string().min(3).max(50),
        role: z.enum(['USER', 'ADMIN', 'READONLY']),
        customerId: z.string().optional()
    }),

    // User update
    update: z.object({
        username: z.string().min(3).max(50).optional(),
        role: z.enum(['USER', 'ADMIN', 'READONLY']).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional()
    }),

    // Profile update
    profileUpdate: z.object({
        username: z.string().min(3).max(50).optional(),
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        avatar: z.string().url().optional()
    })
};

/**
 * Utility functions for creating validated handlers
 */
export function createValidatedHandler<
    TBody = any,
    TQuery = any,
    TParams = any,
    THeaders = any
>(
    handler: (
        request: ValidatedRequest<TBody, TQuery, TParams, THeaders> | 
                 ValidatedAuthenticatedRequest<TBody, TQuery, TParams, THeaders>,
        ...args: any[]
    ) => Promise<NextResponse>,
    options: ValidationOptions
) {
    return withValidation<TBody, TQuery, TParams, THeaders>(handler, options);
}

/**
 * Quick validation helpers for common scenarios
 */
export const validationHelpers = {
    // Validate body only
    body: <T>(schema: SchemaOrZodSchema<T>) => ({
        body: schema
    }),

    // Validate query only
    query: <T>(schema: SchemaOrZodSchema<T>) => ({
        query: schema
    }),

    // Validate params only
    params: <T>(schema: SchemaOrZodSchema<T>) => ({
        params: schema
    }),

    // Validate body and query
    bodyAndQuery: <TBody, TQuery>(bodySchema: SchemaOrZodSchema<TBody>, querySchema: SchemaOrZodSchema<TQuery>) => ({
        body: bodySchema,
        query: querySchema
    }),

    // Validate everything
    all: <TBody, TQuery, TParams, THeaders>(
        bodySchema: SchemaOrZodSchema<TBody>,
        querySchema: SchemaOrZodSchema<TQuery>,
        paramsSchema: SchemaOrZodSchema<TParams>,
        headersSchema: SchemaOrZodSchema<THeaders>
    ) => ({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
        headers: headersSchema
    })
};