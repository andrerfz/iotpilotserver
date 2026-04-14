import {CustomerEntity} from '../entities/customer.entity';
import {CustomerId} from '../value-objects/customer-id.vo';
import {CustomerStatusType} from '../value-objects/customer-status.vo';
import {CustomerInvalidStatusException, CustomerNotFoundException} from '../exceptions/customer.exception';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class CustomerValidator {
  /**
   * Validates that a customer exists
   * @throws CustomerNotFoundException if the customer does not exist
   */
  validateCustomerExists(customer: CustomerEntity | null, customerId: CustomerId): void {
    if (!customer) {
      throw new CustomerNotFoundException(customerId);
    }
  }

  /**
   * Validates that the tenant context has access to the customer
   * @throws Error if the tenant context does not have access to the customer
   */
  validateTenantAccess(customer: CustomerEntity, tenantContext: TenantContext): void {
    if (!tenantContext.isSuperAdminUser()) {
      throw new Error(`User does not have access to customer ${customer.getId().getValue()}`);
    }
  }

  /**
   * Validates that the customer is active
   * @throws Error if the customer is inactive or suspended
   */
  validateCustomerIsActive(customer: CustomerEntity): void {
    if (!customer.isActive) {
      throw new Error(`Customer ${customer.getId().getValue()} is not active`);
    }
  }

  /**
   * Validates that the customer can be deactivated
   * @throws CustomerInvalidStatusException if the customer is already inactive
   */
  validateCanDeactivate(customer: CustomerEntity): void {
    if (!customer.isActive) {
      throw new CustomerInvalidStatusException('inactive', 'inactive', 'Customer is already inactive');
    }
  }

  /**
   * Validates that the customer can be reactivated
   * @throws CustomerInvalidStatusException if the customer is already active
   */
  validateCanReactivate(customer: CustomerEntity): void {
    if (customer.isActive) {
      throw new CustomerInvalidStatusException('active', 'active', 'Customer is already active');
    }
  }

  /**
   * Validates that the customer can be suspended
   * @throws CustomerInvalidStatusException if the customer is already suspended or inactive
   */
  validateCanSuspend(customer: CustomerEntity): void {
    if (!customer.isActive) {
      throw new CustomerInvalidStatusException('inactive', 'suspended', 'Customer is not active');
    }
  }

  /**
   * Validates a status transition
   * @throws CustomerInvalidStatusException if the status transition is invalid
   */
  validateStatusTransition(currentStatus: boolean, newStatus: CustomerStatusType): void {
    if (currentStatus && newStatus === 'active') {
      throw new CustomerInvalidStatusException('active', 'active', 'Customer is already active');
    }
    if (!currentStatus && newStatus === 'inactive') {
      throw new CustomerInvalidStatusException('inactive', 'inactive', 'Customer is already inactive');
    }
  }
}
