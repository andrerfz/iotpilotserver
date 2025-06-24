import {Repository} from '@/lib/shared/domain/interfaces/repository.interface';
import {UserSession, SessionId} from '../entities/user-session.entity';
import {UserId} from '../value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export interface SessionRepository extends Repository<UserSession, SessionId> {
    findByToken(token: string): Promise<UserSession | null>;
    findByUserId(userId: UserId): Promise<UserSession[]>;
    findByUserIdInTenant(userId: UserId, customerId: CustomerId): Promise<UserSession[]>;
    revokeAllForUser(userId: UserId): Promise<void>;
    revokeAllForUserInTenant(userId: UserId, customerId: CustomerId): Promise<void>;
    cleanExpiredSessions(): Promise<void>;
    cleanExpiredSessionsInTenant(customerId: CustomerId): Promise<void>;
}
