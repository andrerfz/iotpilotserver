import {Repository} from '@/lib/shared/domain/interfaces/repository.interface';
import {User} from '../entities/user.entity';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';

export interface UserRepository extends Repository<User, UserId> {
    findByEmail(email: Email): Promise<User | null>;
    emailExists(email: Email): Promise<boolean>;
}