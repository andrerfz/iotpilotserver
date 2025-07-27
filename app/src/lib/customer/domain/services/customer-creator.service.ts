import {CustomerEntity} from '../entities/customer.entity';
import {CustomerId} from '../value-objects/customer-id.vo';
import {CustomerName} from '../value-objects/customer-name.vo';
import {CustomerAlreadyExistsException} from '../exceptions/customer.exception';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class CustomerCreator {
  /**
   * Creates a new customer
   * @throws CustomerAlreadyExistsException if a customer with the same ID already exists
   * @throws Error if the tenant context does not have permission to create customers
   */
  create(
    id: CustomerId,
    name: CustomerName,
    tenantContext: TenantContext
  ): CustomerEntity {
    // Only super admins can create customers
    if (!tenantContext.isSuperAdminUser()) {
      throw new Error('Only super admins can create customers');
    }

    // Create the customer entity
    const customer = CustomerEntity.create(id, name);

    return customer;
  }

  /**
   * Validates that a customer with the given ID does not already exist
   * @throws CustomerAlreadyExistsException if a customer with the same ID already exists
   */
  validateCustomerDoesNotExist(id: CustomerId, exists: boolean): void {
    if (exists) {
      throw new CustomerAlreadyExistsException(id);
    }
  }
}
