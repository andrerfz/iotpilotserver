import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {ListApiKeysQuery} from './list-api-keys.query';
import {ListApiKeysResult} from './list-api-keys.result';
import {ApiKeyRepository} from '@iotpilot/core/user/domain/interfaces/api-key-repository.interface';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {ApiKeyMapper} from '@iotpilot/core/user/infrastructure/mappers/api-key.mapper';

/**
 * Handler for listing API keys query
 * Uses constructor injection for repository dependency
 */
export class ListApiKeysHandler implements QueryHandler<ListApiKeysQuery, ListApiKeysResult> {
    private readonly apiKeyMapper: ApiKeyMapper;

    constructor(private readonly apiKeyRepository: ApiKeyRepository) {
        this.apiKeyMapper = new ApiKeyMapper();
    }

    async handle(query: ListApiKeysQuery): Promise<ListApiKeysResult> {
        const userId = UserId.fromString(query.userId);
        const apiKeys = await this.apiKeyRepository.findByUserId(userId, query.getTenantContext());

        // Map to DTOs with masked keys
        const maskedApiKeys = apiKeys.map((apiKey) => this.apiKeyMapper.toDTO(apiKey));

        return { apiKeys: maskedApiKeys };
    }
}