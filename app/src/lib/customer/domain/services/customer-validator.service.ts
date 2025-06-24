import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerStatus, CustomerStatusEnum } from '../value-objects/customer-status.vo';
import { CustomerNotFoundException, CustomerInvalidStatusException } from '../exceptions/customer.exception';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { TenantAccessDeniedException, TenantInactiveException, TenantSuspendedException } from '@/lib/shared/domain/exceptions/tenant.exception';

@Injectable()
export class CustomerValidator {
  /**
   * Validates that a customer exists
   * @throws CustomerNotFoundException if the customer does not exist
   */
  validateCustomerExists(customer: Customer | null, customerId: CustomerId): void {
    if (!customer) {
      throw new CustomerNotFoundException(customerId);
    }
  }

  /**
   * Validates that the tenant context has access to the customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   */
  validateTenantAccess(customer: Customer, tenantContext: TenantContext): void {
    if (!tenantContext.hasAccess(customer.getId())) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }
  }

  /**
   * Validates that the customer is active
   * @throws TenantInactiveException if the customer is inactive
   * @throws TenantSuspendedException if the customer is suspended
   */
  validateCustomerIsActive(customer: Customer): void {
    if (customer.getStatus().isInactive()) {
      throw new TenantInactiveException(customer.getId());
    }

    if (customer.getStatus().isSuspended()) {
      throw new TenantSuspendedException(customer.getId());
    }
  }

  /**
   * Validates that the customer can be deactivated
   * @throws CustomerInvalidStatusException if the customer is already inactive
   */
  validateCanDeactivate(customer: Customer): void {
    if (customer.getStatus().isInactive()) {
      throw new CustomerInvalidStatusException('Customer is already inactive');
    }
  }

  /**
   * Validates that the customer can be reactivated
   * @throws CustomerInvalidStatusException if the customer is already active
   */
  validateCanReactivate(customer: Customer): void {
    if (customer.getStatus().isActive()) {
      throw new CustomerInvalidStatusException('Customer is already active');
    }
  }

  /**
   * Validates that the customer can be suspended
   * @throws CustomerInvalidStatusException if the customer is already suspended
   */
  validateCanSuspend(customer: Customer): void {
    if (customer.getStatus().isSuspended()) {
      throw new CustomerInvalidStatusException('Customer is already suspended');
    }
  }

  /**
   * Validates a status transition
   * @throws CustomerInvalidStatusException if the status transition is invalid
   */
  validateStatusTransition(currentStatus: CustomerStatus, newStatus: CustomerStatusEnum): void {
    // Define valid transitions
    const validTransitions = {
      [CustomerStatusEnum.ACTIVE]: [CustomerStatusEnum.INACTIVE, CustomerStatusEnum.SUSPENDED],
      [CustomerStatusEnum.INACTIVE]: [CustomerStatusEnum.ACTIVE],
      [CustomerStatusEnum.SUSPENDED]: [CustomerStatusEnum.ACTIVE, CustomerStatusEnum.INACTIVE],
      [CustomerStatusEnum.PENDING]: [CustomerStatusEnum.ACTIVE, CustomerStatusEnum.INACTIVE]
    };

    if (!validTransitions[currentStatus.getValue()].includes(newStatus)) {
      throw new CustomerInvalidStatusException(
        `Invalid status transition from ${currentStatus.getValue()} to ${newStatus}`
      );
    }
  }
}