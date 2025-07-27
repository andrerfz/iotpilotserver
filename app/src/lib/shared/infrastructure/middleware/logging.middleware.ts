// app/src/lib/shared/infrastructure/middleware/logging.middleware.ts
import {NextRequest, NextResponse} from 'next/server';
import {AuthenticatedRequest} from './auth-middleware';

export interface ApiLogEntry {
    timestamp: string;
    method: string;
    path: string;
    query: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    userRole?: string;
    customerId?: string;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    requestBody?: any;
    responseSize?: number;
}

/**
 * Structured logging middleware for DDD architecture
 * Provides comprehensive request/response logging with user context
 */
export function withLogging<T extends NextRequest | AuthenticatedRequest>(
    handler: (request: T, ...args: any[]) => Promise<NextResponse>
) {
    return async (request: T, ...args: any[]): Promise<NextResponse> => {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        const url = new URL(request.url);
        
        // Extract user context if available
        const authRequest = request as AuthenticatedRequest;
        const user = authRequest.user;
        
        // Create base log entry
        const logEntry: ApiLogEntry = {
            timestamp,
            method: request.method,
            path: url.pathname,
            query: url.search,
            userAgent: request.headers.get('user-agent') || undefined,
            ip: getClientIp(request),
            userId: user?.id,
            userRole: user?.role,
            customerId: user?.customerId || undefined
        };

        // Log request body for non-GET requests (excluding sensitive data)
        if (request.method !== 'GET') {
            try {
                const body = await getRequestBody(request);
                logEntry.requestBody = sanitizeRequestBody(body, url.pathname);
            } catch (error) {
                // Body might already be consumed, skip logging it
            }
        }

        console.log('📥 API Request:', {
            method: logEntry.method,
            path: logEntry.path,
            query: logEntry.query,
            userId: logEntry.userId,
            userRole: logEntry.userRole,
            customerId: logEntry.customerId,
            ip: logEntry.ip,
            timestamp: logEntry.timestamp,
            ...(logEntry.requestBody && { body: logEntry.requestBody })
        });

        let response: NextResponse;
        let error: string | undefined;

        try {
            response = await handler(request, ...args);
            logEntry.statusCode = response.status;
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            logEntry.error = error;
            
            // Re-throw the error for proper error handling
            throw err;
        } finally {
            // Calculate response time
            logEntry.responseTime = Date.now() - startTime;
            
            // Log response
            const logLevel = getLogLevel(logEntry.statusCode || 500);
            const logMessage = error ? '❌ API Error' : '📤 API Response';
            
            console[logLevel](logMessage, {
                method: logEntry.method,
                path: logEntry.path,
                statusCode: logEntry.statusCode,
                responseTime: `${logEntry.responseTime}ms`,
                userId: logEntry.userId,
                userRole: logEntry.userRole,
                customerId: logEntry.customerId,
                ...(error && { error }),
                timestamp: timestamp
            });

            // Log slow requests
            if (logEntry.responseTime && logEntry.responseTime > 1000) {
                console.warn('🐌 Slow API Request:', {
                    method: logEntry.method,
                    path: logEntry.path,
                    responseTime: `${logEntry.responseTime}ms`,
                    userId: logEntry.userId,
                    timestamp: timestamp
                });
            }

            // Store log entry for analytics (optional)
            await storeLogEntry(logEntry);
        }

        return response!;
    };
}

/**
 * Extract client IP address from request
 */
function getClientIp(request: NextRequest): string | undefined {
    // Check for forwarded IP headers (common in production with proxies)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to connection remote address
    return request.headers.get('x-forwarded-host') || 'unknown';
}

/**
 * Safely extract request body without consuming the stream
 */
async function getRequestBody(request: NextRequest): Promise<any> {
    try {
        // Clone the request to avoid consuming the original body
        const clonedRequest = request.clone();
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            return await clonedRequest.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await clonedRequest.formData();
            return Object.fromEntries(formData.entries());
        } else if (contentType.includes('text/')) {
            return await clonedRequest.text();
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any, path: string): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'authorization',
        'credit_card', 'ssn', 'social_security', 'bank_account'
    ];

    // Special handling for auth endpoints
    if (path.includes('/auth/')) {
        return {
            ...body,
            password: body.password ? '[REDACTED]' : undefined
        };
    }

    // Generic sanitization
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Determine appropriate log level based on status code
 */
function getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
}

/**
 * Store log entry for analytics and monitoring
 * This could be extended to write to a database or external service
 */
async function storeLogEntry(logEntry: ApiLogEntry): Promise<void> {
    // In a production environment, you might want to:
    // 1. Store logs in a database for analytics
    // 2. Send logs to external monitoring services (DataDog, CloudWatch, etc.)
    // 3. Implement log rotation and cleanup
    
    // For now, we'll just ensure structured logging to console
    // which can be picked up by log aggregators
    
    try {
        // Example: Store in database
        // await prisma.apiLog.create({ data: logEntry });
        
        // Example: Send to external service
        // await sendToMonitoringService(logEntry);
        
        // For development, just ensure the log entry is complete
        if (process.env.NODE_ENV === 'development') {
            // Additional dev logging could go here
        }
    } catch (error) {
        console.error('Failed to store log entry:', error);
        // Don't throw - logging failures shouldn't break the API
    }
}

/**
 * Create a request ID for tracing requests across services
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enhanced logging for specific operations
 */
export function logDomainOperation(
    domain: string,
    operation: string,
    userId?: string,
    customerId?: string,
    details?: any
) {
    console.log(`🏢 ${domain.toUpperCase()} ${operation}:`, {
        domain,
        operation,
        userId,
        customerId,
        timestamp: new Date().toISOString(),
        ...details
    });
}

/**
 * Log security events
 */
export function logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId?: string,
    customerId?: string,
    details?: any
) {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    console[logLevel](`🔒 Security Event [${severity.toUpperCase()}]: ${event}`, {
        event,
        severity,
        userId,
        customerId,
        timestamp: new Date().toISOString(),
        ...details
    });
}