import {ApiKey, ApiKeyProps} from '../../domain/entities/api-key.entity';
import {ApiKeyId} from '../../domain/value-objects/api-key-id.vo';
import {ApiKeyValue} from '../../domain/value-objects/api-key-value.vo';
import {UserId} from '../../domain/value-objects/user-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Mapper for converting between ApiKey domain entity and Prisma model
 * Following DDD principles: mappers are pure and don't depend on infrastructure types
 */
export class ApiKeyMapper {
    /**
     * Convert Prisma model to domain entity
     */
    toDomain(prismaApiKey: any): ApiKey {
        let keyValue: ApiKeyValue;
        try {
            keyValue = ApiKeyValue.fromString(prismaApiKey.key);
        } catch {
            // Legacy keys stored before the iot_ prefix requirement — treat as revoked
            keyValue = ApiKeyValue.fromString('iot_' + '0'.repeat(64));
        }
        const props: ApiKeyProps = {
            id: ApiKeyId.fromString(prismaApiKey.id),
            userId: UserId.fromString(prismaApiKey.userId),
            customerId: CustomerId.fromString(prismaApiKey.customerId || ''),
            name: prismaApiKey.name,
            key: keyValue,
            expiresAt: prismaApiKey.expiresAt,
            lastUsedAt: prismaApiKey.lastUsed,
            createdAt: prismaApiKey.createdAt,
            revokedAt: prismaApiKey.deletedAt // Using deletedAt as revoked indicator
        };

        return ApiKey.reconstitute(props);
    }

    /**
     * Convert domain entity to Prisma model data
     */
    toPersistence(apiKey: ApiKey): any {
        return {
            id: apiKey.id.getValue(),
            userId: apiKey.userId.getValue(),
            customerId: apiKey.customerId?.getValue() || null,
            name: apiKey.name,
            key: apiKey.key.getValue(),
            expiresAt: apiKey.expiresAt,
            lastUsed: apiKey.lastUsedAt,
            createdAt: apiKey.createdAt,
            deletedAt: apiKey.revokedAt
        };
    }

    /**
     * Convert domain entity to DTO for API responses
     */
    toDTO(apiKey: ApiKey): ApiKeyDTO {
        return {
            id: apiKey.id.getValue(),
            userId: apiKey.userId.getValue(),
            customerId: apiKey.customerId?.getValue() || null,
            name: apiKey.name,
            key: apiKey.key.getMaskedValue(), // Always mask the key in DTOs
            expiresAt: apiKey.expiresAt?.toISOString() || null,
            lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
            createdAt: apiKey.createdAt.toISOString(),
            isValid: apiKey.isValid(),
            isExpired: apiKey.isExpired(),
            isRevoked: apiKey.isRevoked()
        };
    }

    /**
     * Convert domain entity to DTO with full key (only for creation response)
     */
    toDTOWithFullKey(apiKey: ApiKey): ApiKeyDTOWithFullKey {
        return {
            ...this.toDTO(apiKey),
            key: apiKey.key.getValue() // Return full key only on creation
        };
    }
}

/**
 * DTO for API Key responses (with masked key)
 */
export interface ApiKeyDTO {
    id: string;
    userId: string;
    customerId: string | null;
    name: string;
    key: string; // Masked
    expiresAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
}

/**
 * DTO for API Key creation response (with full key)
 */
export interface ApiKeyDTOWithFullKey extends ApiKeyDTO {
    key: string; // Full key, not masked
}


