import {ApiKeyDTO} from '@iotpilot/core/user/infrastructure/mappers/api-key.mapper';

/**
 * Result of listing API keys query
 */
export interface ListApiKeysResult {
    apiKeys: ApiKeyDTO[];
}