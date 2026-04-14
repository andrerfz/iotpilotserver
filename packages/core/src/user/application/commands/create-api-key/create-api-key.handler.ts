import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {CreateApiKeyCommand} from './create-api-key.command';
import {CreateApiKeyResult} from './create-api-key.result';
import {ApiKeyRepository} from '@iotpilot/core/user/domain/interfaces/api-key-repository.interface';
import {ApiKey} from '@iotpilot/core/user/domain/entities/api-key.entity';
import {ApiKeyId} from '@iotpilot/core/user/domain/value-objects/api-key-id.vo';
import {ApiKeyValue} from '@iotpilot/core/user/domain/value-objects/api-key-value.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ApiKeyMapper} from '@iotpilot/core/user/infrastructure/mappers/api-key.mapper';
import {ApiKeyLimitExceededException} from '@iotpilot/core/user/domain/exceptions/user.exception';
import {CryptoService} from '@iotpilot/core/shared/domain/interfaces/crypto-service.interface';

const MAX_API_KEYS_PER_USER = parseInt(process.env.MAX_API_KEYS_PER_USER || '5', 10);

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