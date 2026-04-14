import type { StandardApiResponse } from './api-response.util';

/**
 * Unwraps an ApiResponse envelope on the client side.
 * Returns envelope.data when the value looks like a StandardApiResponse
 * (has a boolean `success` field), otherwise returns the value as-is.
 */
export function unwrapApiResponse<T>(value: StandardApiResponse<T> | T | null | undefined): T | null | undefined {
    if (value === null || value === undefined) return value as null | undefined;
    if (typeof value === 'object' && value !== null && 'success' in value && typeof (value as any).success === 'boolean') {
        return (value as StandardApiResponse<T>).data as T;
    }
    return value as T;
}
