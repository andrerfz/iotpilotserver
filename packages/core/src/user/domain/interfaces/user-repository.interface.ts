import {Repository} from '@iotpilot/core/shared/domain/interfaces/repository.interface';
import {UserEntity} from '../entities/user.entity';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {Username} from '../value-objects/username.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

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
    findByUsername(username: Username): Promise<UserEntity | null>;
    findByEmailInTenant(email: Email, customerId: CustomerId): Promise<UserEntity | null>;
    findByCustomerId(customerId: CustomerId): Promise<UserEntity[]>;
    findActive(): Promise<UserEntity[]>;
    findInactive(): Promise<UserEntity[]>;
    exists(id: UserId, tenantContext?: TenantContext): Promise<boolean>;
    count(tenantContext?: TenantContext): Promise<number>;
    existsByEmail(email: Email): Promise<boolean>;
    existsByEmailInTenant(email: Email, customerId: CustomerId): Promise<boolean>;
    findAllInTenant(customerId: CustomerId): Promise<UserEntity[]>;
    findSuperAdmins(): Promise<UserEntity[]>;
    countInTenant(customerId: CustomerId): Promise<number>;
    findActiveInTenant(customerId: CustomerId): Promise<UserEntity[]>;
    findManyWithFilters(criteria: UserFilterCriteria, tenantContext: TenantContext): Promise<UserListResult>;
}
