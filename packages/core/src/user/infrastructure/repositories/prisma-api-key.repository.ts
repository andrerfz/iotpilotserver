import {ApiKeyRepository} from '../../domain/interfaces/api-key-repository.interface';
import {ApiKey} from '../../domain/entities/api-key.entity';
import {ApiKeyId} from '../../domain/value-objects/api-key-id.vo';
import {UserId} from '../../domain/value-objects/user-id.vo';
import {ApiKeyMapper} from '../mappers/api-key.mapper';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {hashApiKey, apiKeyHint} from '@iotpilot/core/shared/infrastructure/crypto/api-key-hasher';

/**
 * Prisma implementation of the ApiKeyRepository interface
 */
export class PrismaApiKeyRepository implements ApiKeyRepository {
    constructor(
        private readonly apiKeyMapper: ApiKeyMapper,
        private readonly prisma: PrismaService
    ) {}

    async findById(id: ApiKeyId, tenantContext?: TenantContext): Promise<ApiKey | null> {
        const where: any = {
            id: id.getValue(),
            deletedAt: null // Exclude soft-deleted
        };

        // Apply tenant filtering if context provided and not superadmin
        if (tenantContext && !tenantContext.isSuperAdmin()) {
            const customerId = tenantContext.getCustomerId();
            if (customerId) {
                where.customerId = customerId.getValue();
            }
        }

        const apiKey = await this.prisma.getClient().apiKey.findFirst({ where });
        return apiKey ? this.apiKeyMapper.toDomain(apiKey) : null;
    }

    async findByKey(key: string, tenantContext?: TenantContext): Promise<ApiKey | null> {
        const where: any = {
            key: hashApiKey(key), // stored hashed — look up by digest, never plaintext
            deletedAt: null // Exclude soft-deleted
        };

        // Note: For API key validation, we typically don't apply tenant filtering
        // because we need to find the key first to determine the tenant
        const apiKey = await this.prisma.getClient().apiKey.findFirst({ where });
        return apiKey ? this.apiKeyMapper.toDomain(apiKey) : null;
    }

    async findByUserId(userId: UserId, tenantContext?: TenantContext): Promise<ApiKey[]> {
        const where: any = {
            userId: userId.getValue(),
            deletedAt: null // Exclude soft-deleted
        };

        // Apply tenant filtering if context provided and not superadmin
        if (tenantContext && !tenantContext.isSuperAdmin()) {
            const customerId = tenantContext.getCustomerId();
            if (customerId) {
                where.customerId = customerId.getValue();
            }
        }

        const apiKeys = await this.prisma.getClient().apiKey.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return apiKeys.flatMap((apiKey: any) => {
            try {
                return [this.apiKeyMapper.toDomain(apiKey)];
            } catch {
                return [];
            }
        });
    }

    async findAll(tenantContext?: TenantContext): Promise<ApiKey[]> {
        const where: any = {
            deletedAt: null // Exclude soft-deleted
        };

        // Apply tenant filtering if context provided and not superadmin
        if (tenantContext && !tenantContext.isSuperAdmin()) {
            const customerId = tenantContext.getCustomerId();
            if (customerId) {
                where.customerId = customerId.getValue();
            }
        }

        const apiKeys = await this.prisma.getClient().apiKey.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return apiKeys.flatMap((apiKey: any) => {
            try {
                return [this.apiKeyMapper.toDomain(apiKey)];
            } catch {
                return [];
            }
        });
    }

    async save(apiKey: ApiKey, tenantContext?: TenantContext): Promise<void> {
        const data = this.apiKeyMapper.toPersistence(apiKey);
        const id = apiKey.id.getValue();

        // Check if API key already exists
        const existingApiKey = await this.prisma.getClient().apiKey.findUnique({
            where: { id }
        });

        if (existingApiKey) {
            // Update existing API key
            const updateData: any = {
                name: data.name,
                lastUsed: data.lastUsed,
                expiresAt: data.expiresAt,
                deletedAt: data.deletedAt
            };

            await this.prisma.getClient().apiKey.update({
                where: { id },
                data: updateData
            });
        } else {
            // Create new API key — persist only the SHA-256 hash of the raw key
            // plus a non-secret display hint. data.key holds the freshly
            // generated plaintext, which is returned to the caller once and
            // never stored.
            await this.prisma.getClient().apiKey.create({
                data: {
                    id,
                    userId: data.userId,
                    customerId: data.customerId,
                    name: data.name,
                    key: hashApiKey(data.key),
                    keyHint: apiKeyHint(data.key),
                    expiresAt: data.expiresAt,
                    lastUsed: data.lastUsed,
                    createdAt: data.createdAt
                }
            });
        }
    }

    async delete(id: ApiKeyId, tenantContext?: TenantContext): Promise<void> {
        const where: any = {
            id: id.getValue()
        };

        // Apply tenant filtering if context provided and not superadmin
        if (tenantContext && !tenantContext.isSuperAdmin()) {
            const customerId = tenantContext.getCustomerId();
            if (customerId) {
                where.customerId = customerId.getValue();
            }
        }

        // Soft delete by setting deletedAt
        await this.prisma.getClient().apiKey.updateMany({
            where,
            data: { deletedAt: new Date() }
        });
    }

    async countByUserId(userId: UserId, tenantContext?: TenantContext): Promise<number> {
        const where: any = {
            userId: userId.getValue(),
            deletedAt: null // Exclude soft-deleted
        };

        // Apply tenant filtering if context provided and not superadmin
        if (tenantContext && !tenantContext.isSuperAdmin()) {
            const customerId = tenantContext.getCustomerId();
            if (customerId) {
                where.customerId = customerId.getValue();
            }
        }

        return this.prisma.getClient().apiKey.count({ where });
    }

    async existsByKey(key: string): Promise<boolean> {
        const apiKey = await this.prisma.getClient().apiKey.findFirst({
            where: {
                key: hashApiKey(key), // stored hashed — compare digests
                deletedAt: null
            }
        });

        return !!apiKey;
    }
}


