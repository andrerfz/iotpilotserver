import {UserEntity} from '../entities/user.entity';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../../../shared/domain/value-objects/email.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';

export interface UserRepository {
  findById(id: UserId, tenantContext?: TenantContext): Promise<UserEntity | null>;
  findByEmail(email: Email, tenantContext?: TenantContext): Promise<UserEntity | null>;
  findAll(tenantContext?: TenantContext): Promise<UserEntity[]>;
  save(user: UserEntity, tenantContext?: TenantContext): Promise<void>;
  delete(id: UserId, tenantContext?: TenantContext): Promise<void>;
  exists(id: UserId, tenantContext?: TenantContext): Promise<boolean>;
  count(tenantContext?: TenantContext): Promise<number>;
}
