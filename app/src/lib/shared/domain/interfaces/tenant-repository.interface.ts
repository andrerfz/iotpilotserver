import { Repository } from './repository.interface';
import { ITenantScoped } from './tenant-scoped.interface';
import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';
import { TenantContext } from '../../application/context/tenant-context.vo';

export interface TenantRepository<T extends ITenantScoped, ID> extends Repository<T, ID> {
  /**
   * Finds an entity by its ID within the tenant context
   */
  findById(id: ID, tenantContext: TenantContext): Promise<T | null>;

  /**
   * Finds all entities within the tenant context
   */
  findAll(tenantContext: TenantContext): Promise<T[]>;

  /**
   * Saves an entity within the tenant context
   */
  save(entity: T, tenantContext: TenantContext): Promise<void>;

  /**
   * Deletes an entity by its ID within the tenant context
   */
  delete(id: ID, tenantContext: TenantContext): Promise<void>;

  /**
   * Finds all entities belonging to a specific tenant
   */
  findByTenant(tenantId: CustomerId): Promise<T[]>;

  /**
   * Counts the number of entities belonging to a specific tenant
   */
  countByTenant(tenantId: CustomerId): Promise<number>;

  /**
   * Checks if an entity with the given ID exists within the tenant
   */
  existsInTenant(id: ID, tenantId: CustomerId): Promise<boolean>;
}