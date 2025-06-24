import {Repository} from '@/lib/shared/domain/interfaces/repository.interface';
import {UserSession, SessionId} from '../entities/user-session.entity';
import {UserId} from '../value-objects/user-id.vo';

export interface SessionRepository extends Repository<UserSession, SessionId> {
    findByToken(token: string): Promise<UserSession | null>;
    findByUserId(userId: UserId): Promise<UserSession[]>;
    revokeAllForUser(userId: UserId): Promise<void>;
    cleanExpiredSessions(): Promise<void>;
}