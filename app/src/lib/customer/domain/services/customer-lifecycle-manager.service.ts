import {CustomerEntity} from '../entities/customer.entity';
import {CustomerStatusType} from '../value-objects/customer-status.vo';
import {CustomerValidator} from './customer-validator.service';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class CustomerLifecycleManager {
  constructor(
    private readonly customerValidator: CustomerValidator
  ) {}

  /**
   * Activates a customer
   * @throws Error if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already active
   */
  activate(customer: CustomerEntity, tenantContext: TenantContext): CustomerEntity {
    // Validate tenant access
    if (!tenantContext.isSuperAdminUser()) {
      throw new Error(`User does not have access to customer ${customer.getId().getValue()}`);
    }

    // Validate that the customer can be activated
    this.customerValidator.validateCanReactivate(customer);

    // Activate the customer
    customer.activate();

    return customer;
  }

  /**
   * Deactivates a customer
   * @throws Error if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already inactive
   */
  deactivate(customer: CustomerEntity, tenantContext: TenantContext): CustomerEntity {
    // Validate tenant access
    if (!tenantContext.isSuperAdminUser()) {
      throw new Error(`User does not have access to customer ${customer.getId().getValue()}`);
    }

    // Validate that the customer can be deactivated
    this.customerValidator.validateCanDeactivate(customer);

    // Deactivate the customer
    customer.deactivate();

    return customer;
  }

  /**
   * Suspends a customer
   * @throws Error if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already suspended
   */
  suspend(customer: CustomerEntity, tenantContext: TenantContext): CustomerEntity {
    // Validate tenant access
    if (!tenantContext.isSuperAdminUser()) {
      throw new Error(`User does not have access to customer ${customer.getId().getValue()}`);
    }

    // Validate that the customer can be suspended
    this.customerValidator.validateCanSuspend(customer);

    // Suspend the customer
    customer.suspend();

    return customer;
  }

  /**
   * Changes the status of a customer
   * @throws Error if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the status transition is invalid
   */
  changeStatus(
    customer: CustomerEntity,
    newStatus: CustomerStatusType,
    tenantContext: TenantContext
  ): CustomerEntity {
    // Validate tenant access
    const customerId = customer.getId();
    if (!tenantContext.hasAccess(customerId) && !tenantContext.canBypassTenantRestrictions()) {
      throw new Error(
        `User ${tenantContext.getUserId().getValue()} does not have access to customer ${customerId.getValue()}`
      );
    }

    // Validate the status transition
    this.customerValidator.validateStatusTransition(customer.isActive, newStatus);

    // Change the status based on the new status
    switch (newStatus) {
      case 'active':
        return this.activate(customer, tenantContext);
      case 'inactive':
        return this.deactivate(customer, tenantContext);
      case 'suspended':
        return this.suspend(customer, tenantContext);
      default:
        throw new Error(`Unsupported status transition to ${newStatus}`);
    }
  }
}
