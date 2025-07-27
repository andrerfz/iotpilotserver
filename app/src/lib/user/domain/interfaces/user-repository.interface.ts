import {Repository} from '@/lib/shared/domain/interfaces/repository.interface';
import {UserEntity} from '../entities/user.entity';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export interface UserFilterCriteria {
    customerId?: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface UserListResult {
    users: UserEntity[];
    total: number;
}

export interface UserRepository extends Repository<UserEntity, UserId> {
    findByEmail(email: Email, tenantContext?: TenantContext): Promise<UserEntity | null>;
    findByEmailInTenant(email: Email, customerId: CustomerId): Promise<UserEntity | null>;
    existsByEmail(email: Email): Promise<boolean>;
    existsByEmailInTenant(email: Email, customerId: CustomerId): Promise<boolean>;
    findAllInTenant(customerId: CustomerId): Promise<UserEntity[]>;
    findSuperAdmins(): Promise<UserEntity[]>;
    countInTenant(customerId: CustomerId): Promise<number>;
    findActiveInTenant(customerId: CustomerId): Promise<UserEntity[]>;
    findManyWithFilters(criteria: UserFilterCriteria, tenantContext: TenantContext): Promise<UserListResult>;
}
