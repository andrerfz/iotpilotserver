import {ApiKey} from '../entities/api-key.entity';
import {ApiKeyId} from '../value-objects/api-key-id.vo';
import {ApiKeyValue} from '../value-objects/api-key-value.vo';
import {UserId} from '../value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiKeyRepository} from '../interfaces/api-key-repository.interface';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {ApiKeyLimitExceededException, ApiKeyNotFoundException} from '../exceptions/user.exception';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';
import {environment} from '@/environment';

const MAX_API_KEYS_PER_USER = environment.limits.maxApiKeysPerUser;

export interface CreateApiKeyParams {
    userId: UserId;
    customerId: CustomerId;
    name: string;
    expiresAt?: Date | null;
}

export interface ApiKeyValidationResult {
    isValid: boolean;
    apiKey?: ApiKey;
    reason?: string;
}

/**
 * Domain service for managing API keys
 * Encapsulates business logic for API key operations
 */
export class ApiKeyManager {
    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly cryptoService: CryptoService
    ) {}

    /**
     * Create a new API key for a user
     * Enforces business rules like key limits
     */
    async createApiKey(
        params: CreateApiKeyParams,
        tenantContext?: TenantContext
    ): Promise<ApiKey> {
        // Check API key limit per user
        const existingCount = await this.apiKeyRepository.countByUserId(
            params.userId,
            tenantContext
        );

        if (existingCount >= MAX_API_KEYS_PER_USER) {
            throw new ApiKeyLimitExceededException(
                params.userId,
                MAX_API_KEYS_PER_USER
            );
        }

        // Generate secure API key
        const apiKeyValue = ApiKeyValue.generate(this.cryptoService);

        // Create domain entity
        const apiKey = ApiKey.create(
            ApiKeyId.generate(),
            params.userId,
            params.customerId,
            params.name,
            apiKeyValue,
            params.expiresAt
        );

        // Save to repository
        await this.apiKeyRepository.save(apiKey, tenantContext);

        return apiKey;
    }

    /**
     * Validate an API key
     * Returns the API key entity if valid
     */
    async validateApiKey(keyValue: string): Promise<ApiKeyValidationResult> {
        // Check format
        if (!ApiKeyValue.isValidFormat(keyValue)) {
            return { isValid: false, reason: 'Invalid API key format' };
        }

        // Find the API key
        const apiKey = await this.apiKeyRepository.findByKey(keyValue);
        
        if (!apiKey) {
            return { isValid: false, reason: 'API key not found' };
        }

        if (apiKey.isRevoked()) {
            return { isValid: false, reason: 'API key has been revoked' };
        }

        if (apiKey.isExpired()) {
            return { isValid: false, reason: 'API key has expired' };
        }

        // Record usage
        apiKey.recordUsage();
        await this.apiKeyRepository.save(apiKey);

        return { isValid: true, apiKey };
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(
        apiKeyId: ApiKeyId,
        tenantContext?: TenantContext
    ): Promise<void> {
        const apiKey = await this.apiKeyRepository.findById(apiKeyId, tenantContext);
        
        if (!apiKey) {
            throw new ApiKeyNotFoundException(`API key with ID ${apiKeyId.getValue()} not found`);
        }

        apiKey.revoke();
        await this.apiKeyRepository.save(apiKey, tenantContext);
    }

    /**
     * Get all API keys for a user
     */
    async getUserApiKeys(
        userId: UserId,
        tenantContext?: TenantContext
    ): Promise<ApiKey[]> {
        return this.apiKeyRepository.findByUserId(userId, tenantContext);
    }

    /**
     * Update API key name
     */
    async updateApiKeyName(
        apiKeyId: ApiKeyId,
        newName: string,
        tenantContext?: TenantContext
    ): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findById(apiKeyId, tenantContext);
        
        if (!apiKey) {
            throw new ApiKeyNotFoundException(`API key with ID ${apiKeyId.getValue()} not found`);
        }

        apiKey.updateName(newName);
        await this.apiKeyRepository.save(apiKey, tenantContext);

        return apiKey;
    }

    /**
     * Update API key expiration
     */
    async updateApiKeyExpiration(
        apiKeyId: ApiKeyId,
        expiresAt: Date | null,
        tenantContext?: TenantContext
    ): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findById(apiKeyId, tenantContext);
        
        if (!apiKey) {
            throw new ApiKeyNotFoundException(`API key with ID ${apiKeyId.getValue()} not found`);
        }

        apiKey.updateExpiration(expiresAt);
        await this.apiKeyRepository.save(apiKey, tenantContext);

        return apiKey;
    }

    /**
     * Count valid API keys for a user
     */
    async countUserApiKeys(
        userId: UserId,
        tenantContext?: TenantContext
    ): Promise<number> {
        return this.apiKeyRepository.countByUserId(userId, tenantContext);
    }

    /**
     * Check if user can create more API keys
     */
    async canCreateApiKey(
        userId: UserId,
        tenantContext?: TenantContext
    ): Promise<boolean> {
        const count = await this.apiKeyRepository.countByUserId(userId, tenantContext);
        return count < MAX_API_KEYS_PER_USER;
    }
}

