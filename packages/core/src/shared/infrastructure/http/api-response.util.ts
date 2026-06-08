import {NextResponse} from 'next/server';
import {PaginationMeta} from './pagination.util';

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

// Static factory for Next.js middleware responses
export class ApiResponse {
    private static json(status: number, body: object): NextResponse {
        return NextResponse.json(body, { status });
    }

    static unauthorized(message = 'Unauthorized'): NextResponse {
        return ApiResponse.json(401, { success: false, error: message, code: 'UNAUTHORIZED', timestamp: new Date().toISOString() });
    }

    static forbidden(message = 'Forbidden'): NextResponse {
        return ApiResponse.json(403, { success: false, error: message, code: 'FORBIDDEN', timestamp: new Date().toISOString() });
    }

    static internalError(message = 'Internal server error'): NextResponse {
        return ApiResponse.json(500, { success: false, error: message, code: 'INTERNAL_ERROR', timestamp: new Date().toISOString() });
    }
}
