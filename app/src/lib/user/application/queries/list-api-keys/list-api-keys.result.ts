import {ApiKeyDTO} from '@/lib/user/infrastructure/mappers/api-key.mapper';

/**
 * Result of listing API keys query
 */
export interface ListApiKeysResult {
    apiKeys: ApiKeyDTO[];
}