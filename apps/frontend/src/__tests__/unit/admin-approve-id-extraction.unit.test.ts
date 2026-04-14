import { describe, it, expect } from 'vitest';
import { extractIdFromApproveUrl } from '@/app/api/admin/users/[id]/approve/extract-id';

describe('extractIdFromApproveUrl', () => {
    it('extracts the user ID from a full approve URL', () => {
        expect(extractIdFromApproveUrl('http://localhost:3000/api/admin/users/abc123/approve'))
            .toBe('abc123');
    });

    it('extracts a UUID-style ID', () => {
        expect(extractIdFromApproveUrl('https://app.example.com/api/admin/users/clz1234abcd/approve'))
            .toBe('clz1234abcd');
    });

    it('returns null when the URL does not match the expected pattern', () => {
        expect(extractIdFromApproveUrl('http://localhost/api/admin/users')).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(extractIdFromApproveUrl('')).toBeNull();
    });

    it('does NOT return the string "approve" as the ID', () => {
        const id = extractIdFromApproveUrl('http://localhost/api/admin/users/user-42/approve');
        expect(id).not.toBe('approve');
        expect(id).toBe('user-42');
    });
});
