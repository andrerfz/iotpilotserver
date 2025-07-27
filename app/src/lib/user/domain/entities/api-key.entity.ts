import {TenantScopedEntity} from '@/lib/shared/domain/entities/tenant-scoped.entity';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiKeyId} from '../value-objects/api-key-id.vo';
import {ApiKeyValue} from '../value-objects/api-key-value.vo';
import {UserId} from '../value-objects/user-id.vo';
import {ApiKeyCreatedEvent} from '../events/api-key-created.event';
import {ApiKeyRevokedEvent} from '../events/api-key-revoked.event';

export interface ApiKeyProps {
    id: ApiKeyId;
    userId: UserId;
    customerId: CustomerId;
    name: string;
    key: ApiKeyValue;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    revokedAt: Date | null;
}

/**
 * Domain entity representing an API Key
 * API Keys are used for programmatic access to the system (device heartbeats, etc.)
 */
export class ApiKey extends TenantScopedEntity<ApiKeyId> {
    private _userId: UserId;
    private _name: string;
    private _key: ApiKeyValue;
    private _expiresAt: Date | null;
    private _lastUsedAt: Date | null;
    private _createdAt: Date;
    private _revokedAt: Date | null;

    constructor(props: ApiKeyProps) {
        super(props.id, props.customerId);
        this.validateName(props.name);
        
        this._userId = props.userId;
        this._name = props.name;
        this._key = props.key;
        this._expiresAt = props.expiresAt;
        this._lastUsedAt = props.lastUsedAt;
        this._createdAt = props.createdAt;
        this._revokedAt = props.revokedAt;
    }

    getId(): ApiKeyId {
        return this._entityId;
    }

    get id(): ApiKeyId {
        return this._entityId;
    }

    get userId(): UserId {
        return this._userId;
    }


    get name(): string {
        return this._name;
    }

    get key(): ApiKeyValue {
        return this._key;
    }

    get expiresAt(): Date | null {
        return this._expiresAt ? new Date(this._expiresAt) : null;
    }

    get lastUsedAt(): Date | null {
        return this._lastUsedAt ? new Date(this._lastUsedAt) : null;
    }

    get createdAt(): Date {
        return new Date(this._createdAt);
    }

    get revokedAt(): Date | null {
        return this._revokedAt ? new Date(this._revokedAt) : null;
    }

    /**
     * Check if the API key is currently valid (not expired, not revoked)
     */
    isValid(): boolean {
        return !this.isRevoked() && !this.isExpired();
    }

    /**
     * Check if the API key has been revoked
     */
    isRevoked(): boolean {
        return this._revokedAt !== null;
    }

    /**
     * Check if the API key has expired
     */
    isExpired(): boolean {
        if (!this._expiresAt) {
            return false;
        }
        return new Date() > this._expiresAt;
    }

    /**
     * Record that the API key was used
     */
    recordUsage(): void {
        if (!this.isValid()) {
            throw new Error('Cannot record usage on invalid API key');
        }
        this._lastUsedAt = new Date();
    }

    /**
     * Revoke the API key
     */
    revoke(): void {
        if (this.isRevoked()) {
            throw new Error('API key is already revoked');
        }
        this._revokedAt = new Date();
        this.addEvent(new ApiKeyRevokedEvent(
            this._entityId,
            this._userId,
            this.getTenantId()
        ));
    }

    /**
     * Update the name of the API key
     */
    updateName(name: string): void {
        this.validateName(name);
        this._name = name;
    }

    /**
     * Update the expiration date of the API key
     */
    updateExpiration(expiresAt: Date | null): void {
        if (expiresAt && expiresAt <= new Date()) {
            throw new Error('Expiration date must be in the future');
        }
        this._expiresAt = expiresAt;
    }

    private validateName(name: string): void {
        if (!name || name.trim().length === 0) {
            throw new Error('API key name cannot be empty');
        }
        if (name.length > 100) {
            throw new Error('API key name cannot exceed 100 characters');
        }
    }

    /**
     * Create a new API key
     */
    static create(
        id: ApiKeyId,
        userId: UserId,
        customerId: CustomerId,
        name: string,
        key: ApiKeyValue,
        expiresAt?: Date | null
    ): ApiKey {
        const apiKey = new ApiKey({
            id,
            userId,
            customerId,
            name,
            key,
            expiresAt: expiresAt || null,
            lastUsedAt: null,
            createdAt: new Date(),
            revokedAt: null
        });

        apiKey.addEvent(new ApiKeyCreatedEvent(
            id,
            userId,
            customerId
        ));

        return apiKey;
    }

    /**
     * Reconstitute an API key from persistence
     */
    static reconstitute(props: ApiKeyProps): ApiKey {
        return new ApiKey(props);
    }
}


