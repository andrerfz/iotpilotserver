import {Entity} from '@/lib/shared/domain/interfaces/entity.interface';
import {UserId} from '../value-objects/user-id.vo';

export class SessionId {
    constructor(private readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('SessionId cannot be empty');
        }
    }

    getValue(): string {
        return this.value;
    }

    equals(other: SessionId): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    static create(value: string): SessionId {
        return new SessionId(value);
    }

    static generate(): SessionId {
        return new SessionId(crypto.randomUUID());
    }
}

export class UserSession extends Entity<SessionId> {
    constructor(
        id: SessionId,
        private readonly userId: UserId,
        private readonly token: string,
        private readonly expiresAt: Date,
        private readonly createdAt: Date,
        private readonly ipAddress: string,
        private readonly userAgent: string,
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

    getToken(): string {
        return this.token;
    }

    getExpiresAt(): Date {
        return this.expiresAt;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getIpAddress(): string {
        return this.ipAddress;
    }

    getUserAgent(): string {
        return this.userAgent;
    }

    isRevoked(): boolean {
        return this.revoked;
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isValid(): boolean {
        return !this.isRevoked() && !this.isExpired();
    }

    revoke(): void {
        this.revoked = true;
    }

    static create(
        userId: UserId,
        token: string,
        expiresAt: Date,
        ipAddress: string,
        userAgent: string
    ): UserSession {
        return new UserSession(
            SessionId.generate(),
            userId,
            token,
            expiresAt,
            new Date(),
            ipAddress,
            userAgent
        );
    }
}