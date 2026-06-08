import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {ApiKey} from '../entities/api-key.entity';
import {ApiKeyId} from '../value-objects/api-key-id.vo';
import {UserId} from '../value-objects/user-id.vo';

/**
 * Repository interface for ApiKey aggregate
 * Following the repository pattern for data access abstraction
 */
export interface ApiKeyRepository {
    /**
     * Find an API key by its ID
     */
    findById(id: ApiKeyId, tenantContext?: TenantContext): Promise<ApiKey | null>;

    /**
     * Find an API key by its actual key value
     */
    findByKey(key: string, tenantContext?: TenantContext): Promise<ApiKey | null>;

    /**
     * Find all API keys for a specific user
     */
    findByUserId(userId: UserId, tenantContext?: TenantContext): Promise<ApiKey[]>;

    /**
     * Find all API keys for the current tenant
     */
    findAll(tenantContext?: TenantContext): Promise<ApiKey[]>;

    /**
     * Save a new or updated API key
     */
    save(apiKey: ApiKey, tenantContext?: TenantContext): Promise<void>;

    /**
     * Delete an API key (soft delete)
     */
    delete(id: ApiKeyId, tenantContext?: TenantContext): Promise<void>;

    /**
     * Count API keys for a user (for enforcing limits)
     */
    countByUserId(userId: UserId, tenantContext?: TenantContext): Promise<number>;

    /**
     * Check if a key value already exists
     */
    existsByKey(key: string): Promise<boolean>;
}


