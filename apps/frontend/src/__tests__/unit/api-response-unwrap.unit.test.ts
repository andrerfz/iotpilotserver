import { describe, it, expect } from 'vitest';
import { unwrapApiResponse } from '@iotpilot/core/shared/infrastructure/http/api-response-unwrap';

describe('unwrapApiResponse', () => {
    it('extracts data from a standard ApiResponse envelope', () => {
        const envelope = {
            success: true,
            data: { theme: 'dark', itemsPerPage: '25' },
            timestamp: '2026-04-28T10:00:00Z'
        };
        expect(unwrapApiResponse(envelope)).toEqual({ theme: 'dark', itemsPerPage: '25' });
    });

    it('extracts data from a paginated ApiResponse envelope', () => {
        const envelope = {
            success: true,
            data: [{ id: '1', email: 'a@b.com' }],
            meta: { pagination: { total: 1, page: 1, limit: 20, pages: 1 } },
            timestamp: '2026-04-28T10:00:00Z'
        };
        expect(unwrapApiResponse(envelope)).toEqual([{ id: '1', email: 'a@b.com' }]);
    });

    it('falls back to the raw value when data field is absent', () => {
        const raw = { theme: 'light' };
        expect(unwrapApiResponse(raw)).toEqual({ theme: 'light' });
    });

    it('returns null for null input', () => {
        expect(unwrapApiResponse(null)).toBeNull();
    });

    it('returns undefined for undefined input', () => {
        expect(unwrapApiResponse(undefined)).toBeUndefined();
    });

    it('does not double-unwrap a plain data object that happens to have a data key', () => {
        // Only unwrap when success flag is present — i.e. it looks like a StandardApiResponse
        const plainObj = { data: 'just a string value', other: 'field' };
        // No success flag → treat as raw, return as-is
        expect(unwrapApiResponse(plainObj)).toEqual(plainObj);
    });
});
