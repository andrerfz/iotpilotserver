import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { CustomerId } from '../value-objects/customer-id.vo';
import { CustomerName } from '../value-objects/customer-name.vo';
import { OrganizationSettings } from '../value-objects/organization-settings.vo';
import { CustomerAlreadyExistsException } from '../exceptions/customer.exception';
import { TenantContext } from '../../../shared/application/context/tenant-context.vo';
import { TenantAccessDeniedException } from '../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class CustomerCreator {
  /**
   * Creates a new customer
   * @throws CustomerAlreadyExistsException if a customer with the same ID already exists
   * @throws TenantAccessDeniedException if the tenant context does not have permission to create customers
   */
  create(
    id: CustomerId,
    name: CustomerName,
    settings: OrganizationSettings,
    tenantContext: TenantContext
  ): Customer {
    // Only super admins can create customers
    if (!tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        id,
        'Only super admins can create customers'
      );
    }

    // Create the customer entity
    const customer = Customer.create(id, name, settings);
    
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