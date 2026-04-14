import {CustomerEntity} from '../entities/customer.entity';
import {CustomerId} from '../value-objects/customer-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

/**
 * Customer repository abstraction (single source of truth).
 * Application handlers should depend on this interface, not on ad-hoc shapes.
 */
export interface CustomerRepository {
  save(customer: CustomerEntity, tenantContext?: TenantContext): Promise<void>;
  findById(id: CustomerId, tenantContext?: TenantContext): Promise<CustomerEntity | null>;
  findByName(name: string, tenantContext?: TenantContext): Promise<CustomerEntity | null>;
  findByDomain(domain: string, tenantContext?: TenantContext): Promise<CustomerEntity | null>;
  findAll(tenantContext?: TenantContext): Promise<CustomerEntity[]>;
  delete(id: CustomerId, tenantContext?: TenantContext): Promise<void>;
}


