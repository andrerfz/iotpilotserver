/**
 * Result of creating an API key command
 */
export interface CreateApiKeyResult {
    id: string;
    name: string;
    key: string; // Full key returned only on creation
    customerId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
}