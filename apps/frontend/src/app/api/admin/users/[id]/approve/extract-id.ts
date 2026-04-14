/**
 * Extracts the user ID from an approve route URL.
 * URL pattern: /api/admin/users/{id}/approve
 */
export function extractIdFromApproveUrl(url: string): string | null {
    const match = url.match(/\/users\/([^/]+)\/approve/);
    return match?.[1] ?? null;
}
