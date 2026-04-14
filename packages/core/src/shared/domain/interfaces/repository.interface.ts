import {TenantContext} from '../tenant-context';

export interface Repository<T, ID> {
    findById(id: ID, tenantContext?: TenantContext): Promise<T | null>;

    findAll(tenantContext?: TenantContext): Promise<T[]>;

    save(entity: T, tenantContext?: TenantContext): Promise<void>;

    delete(id: ID, tenantContext?: TenantContext): Promise<void>;
}
