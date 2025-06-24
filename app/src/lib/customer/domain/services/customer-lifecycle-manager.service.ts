import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { CustomerId } from '../value-objects/customer-id.vo';
import { CustomerStatus, CustomerStatusEnum } from '../value-objects/customer-status.vo';
import { CustomerValidator } from './customer-validator.service';
import { TenantContext } from '../../../shared/application/context/tenant-context.vo';
import { TenantAccessDeniedException } from '../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class CustomerLifecycleManager {
  constructor(
    private readonly customerValidator: CustomerValidator
  ) {}

  /**
   * Activates a customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already active
   */
  activate(customer: Customer, tenantContext: TenantContext): Customer {
    // Validate tenant access
    if (!tenantContext.hasAccess(customer.getId()) && !tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }

    // Validate that the customer can be activated
    this.customerValidator.validateCanReactivate(customer);

    // Activate the customer
    customer.reactivate();

    return customer;
  }

  /**
   * Deactivates a customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already inactive
   */
  deactivate(customer: Customer, tenantContext: TenantContext): Customer {
    // Validate tenant access
    if (!tenantContext.hasAccess(customer.getId()) && !tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }

    // Validate that the customer can be deactivated
    this.customerValidator.validateCanDeactivate(customer);

    // Deactivate the customer
    customer.deactivate();

    return customer;
  }

  /**
   * Suspends a customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already suspended
   */
  suspend(customer: Customer, tenantContext: TenantContext): Customer {
    // Validate tenant access
    if (!tenantContext.hasAccess(customer.getId()) && !tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }

    // Validate that the customer can be suspended
    this.customerValidator.validateCanSuspend(customer);

    // Suspend the customer
    customer.suspend();

    return customer;
  }

  /**
   * Changes the status of a customer
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the status transition is invalid
   */
  changeStatus(
    customer: Customer,
    newStatus: CustomerStatusEnum,
    tenantContext: TenantContext
  ): Customer {
    // Validate tenant access
    if (!tenantContext.hasAccess(customer.getId()) && !tenantContext.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        tenantContext.getUserId().toString(),
        customer.getId(),
        `User ${tenantContext.getUserId().toString()} does not have access to customer ${customer.getId().toString()}`
      );
    }

    // Validate the status transition
    this.customerValidator.validateStatusTransition(customer.getStatus(), newStatus);

    // Change the status based on the new status
    switch (newStatus) {
      case CustomerStatusEnum.ACTIVE:
        return this.activate(customer, tenantContext);
      case CustomerStatusEnum.INACTIVE:
        return this.deactivate(customer, tenantContext);
      case CustomerStatusEnum.SUSPENDED:
        return this.suspend(customer, tenantContext);
      default:
        throw new Error(`Unsupported status transition to ${newStatus}`);
    }
  }
}