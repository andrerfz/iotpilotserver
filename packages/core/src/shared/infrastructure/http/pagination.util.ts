/**
 * Pagination Utility
 * 
 * Provides standardized pagination structure for API responses
 * Ensures DRY principle and consistency across all endpoints
 * 
 * Usage:
 *   import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
 *   
 *   const pagination = Pagination.create(page, limit, total);
 *   return ApiResponse.ok(data, correlationId, { pagination });
 */

/**
 * Standard pagination metadata structure
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
}

/**
 * Pagination utility class
 */
export class Pagination {
    /**
     * Create pagination metadata from pagination parameters
     */
    static create(
        page: number,
        limit: number,
        total: number
    ): PaginationMeta {
        const totalPages = Math.ceil(total / limit);
        
        return {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            hasPrevious: page > 1
        };
    }

    /**
     * Create pagination from offset-based pagination
     * Converts offset/limit to page-based
     */
    static fromOffset(
        offset: number,
        limit: number,
        total: number
    ): PaginationMeta {
        const page = Math.floor(offset / limit) + 1;
        return this.create(page, limit, total);
    }

    /**
     * Calculate skip value for database queries
     */
    static calculateSkip(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    /**
     * Validate pagination parameters
     */
    static validate(page: number, limit: number, maxLimit: number = 100): {
        isValid: boolean;
        page: number;
        limit: number;
        errors?: string[];
    } {
        const errors: string[] = [];
        let validPage = page;
        let validLimit = limit;

        if (page < 1) {
            errors.push('Page must be greater than 0');
            validPage = 1;
        }

        if (limit < 1) {
            errors.push('Limit must be greater than 0');
            validLimit = 10;
        }

        if (limit > maxLimit) {
            errors.push(`Limit cannot exceed ${maxLimit}`);
            validLimit = maxLimit;
        }

        return {
            isValid: errors.length === 0,
            page: validPage,
            limit: validLimit,
            ...(errors.length > 0 && { errors })
        };
    }

    /**
     * Parse pagination from query parameters
     */
    static fromQueryParams(
        searchParams: URLSearchParams,
        defaultLimit: number = 20,
        maxLimit: number = 100
    ): {
        page: number;
        limit: number;
        skip: number;
        validation: ReturnType<typeof Pagination.validate>;
    } {
        const page = parseInt(searchParams.get('page') || '1', 10) || 1;
        const limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10) || defaultLimit;
        
        const validation = this.validate(page, limit, maxLimit);
        const skip = this.calculateSkip(validation.page, validation.limit);

        return {
            page: validation.page,
            limit: validation.limit,
            skip,
            validation
        };
    }
}

