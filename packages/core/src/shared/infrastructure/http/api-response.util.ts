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

