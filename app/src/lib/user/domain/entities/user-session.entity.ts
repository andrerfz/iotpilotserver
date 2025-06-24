import {Entity} from '@/lib/shared/domain/interfaces/entity.interface';
import {UserId} from '../value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {v4 as uuidv4} from 'uuid';

export class SessionId {
    constructor(private readonly value: string) {}

    getValue(): string {
        return this.value;
    }

    equals(other: SessionId): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    static create(): SessionId {
        return new SessionId(uuidv4());
    }

    static fromString(value: string): SessionId {
        return new SessionId(value);
    }
}

export class UserSession extends Entity<SessionId> {
    constructor(
        id: SessionId,
        private readonly userId: UserId,
        private readonly customerId: CustomerId | null, // null for SUPERADMIN sessions
        private readonly token: string,
        private readonly expiresAt: Date,
        private readonly createdAt: Date,
        private revoked: boolean = false
    ) {
        super(id);
    }

    getId(): SessionId {
        return this.id;
    }

    getUserId(): UserId {
        return this.userId;
    }

    getCustomerId(): CustomerId | null {
        return this.customerId;
    }

    getToken(): string {
        return this.token;
    }

    getExpiresAt(): Date {
        return this.expiresAt;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    isRevoked(): boolean {
        return this.revoked;
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isValid(): boolean {
        return !this.revoked && !this.isExpired();
    }

    isSuperAdminSession(): boolean {
        return this.customerId === null;
    }

    belongsToTenant(tenantId: CustomerId): boolean {
        if (this.isSuperAdminSession()) return true; // SUPERADMIN sessions have access to all tenants
        return this.customerId?.equals(tenantId) || false;
    }

    revoke(): void {
        this.revoked = true;
    }

    static create(
        userId: UserId,
        customerId: CustomerId | null,
        token: string,
        expirationHours: number = 24
    ): UserSession {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expirationHours);

        return new UserSession(
            SessionId.create(),
            userId,
            customerId,
            token,
            expiresAt,
            new Date()
        );
    }

    equals(other: Entity<SessionId>): boolean {
        return other instanceof UserSession && this.id.equals(other.id);
    }
}
