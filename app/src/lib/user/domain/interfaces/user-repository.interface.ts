import {Repository} from '@/lib/shared/domain/interfaces/repository.interface';
import {User} from '../entities/user.entity';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export interface UserRepository extends Repository<User, UserId> {
    findByEmail(email: Email): Promise<User | null>;
    findByEmailInTenant(email: Email, customerId: CustomerId): Promise<User | null>;
    existsByEmail(email: Email): Promise<boolean>;
    existsByEmailInTenant(email: Email, customerId: CustomerId): Promise<boolean>;
    findAllInTenant(customerId: CustomerId): Promise<User[]>;
    findSuperAdmins(): Promise<User[]>;
    countInTenant(customerId: CustomerId): Promise<number>;
    findActiveInTenant(customerId: CustomerId): Promise<User[]>;
}
