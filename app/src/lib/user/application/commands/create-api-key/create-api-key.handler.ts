import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {CreateApiKeyCommand} from './create-api-key.command';
import {CreateApiKeyResult} from './create-api-key.result';
import {ApiKeyRepository} from '@/lib/user/domain/interfaces/api-key-repository.interface';
import {ApiKey} from '@/lib/user/domain/entities/api-key.entity';
import {ApiKeyId} from '@/lib/user/domain/value-objects/api-key-id.vo';
import {ApiKeyValue} from '@/lib/user/domain/value-objects/api-key-value.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiKeyMapper} from '@/lib/user/infrastructure/mappers/api-key.mapper';
import {ApiKeyLimitExceededException} from '@/lib/user/domain/exceptions/user.exception';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';

import {environment} from '@/environment';

const MAX_API_KEYS_PER_USER = environment.limits.maxApiKeysPerUser;

/**
 * Handler for creating API keys command
 * Uses constructor injection for repository dependency
 */
export class CreateApiKeyHandler implements CommandHandler<CreateApiKeyCommand, CreateApiKeyResult> {
    private readonly apiKeyMapper: ApiKeyMapper;

    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly cryptoService: CryptoService
    ) {
        this.apiKeyMapper = new ApiKeyMapper();
    }

    async handle(command: CreateApiKeyCommand): Promise<CreateApiKeyResult> {
        const userId = UserId.fromString(command.userId);
        const customerId = CustomerId.fromString(command.customerId);

        // Check API key limit
        const existingCount = await this.apiKeyRepository.countByUserId(userId, command.getTenantContext());
        if (existingCount >= MAX_API_KEYS_PER_USER) {
            throw new ApiKeyLimitExceededException(
                userId,
                MAX_API_KEYS_PER_USER
            );
        }

        // Generate secure API key value
        const apiKeyValue = ApiKeyValue.generate(this.cryptoService);

        // Create domain entity
        const apiKey = ApiKey.create(
            ApiKeyId.generate(),
            userId,
            customerId,
            command.name,
            apiKeyValue,
            command.expiresAt
        );

        // Save to repository
        await this.apiKeyRepository.save(apiKey, command.getTenantContext());

        // Return DTO with full key (only on creation)
        const dto = this.apiKeyMapper.toDTOWithFullKey(apiKey);

        return {
            id: dto.id,
            name: dto.name,
            key: dto.key, // Full key returned only on creation
            customerId: dto.customerId,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt
        };
    }
}