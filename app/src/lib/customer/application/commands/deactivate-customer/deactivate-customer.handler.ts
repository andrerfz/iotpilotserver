import { Injectable } from '@nestjs/common';
import { CommandHandler } from '../../../../shared/application/interfaces/command.interface';
import { DeactivateCustomerCommand } from './deactivate-customer.command';
import { TenantRepository } from '../../../../shared/domain/interfaces/tenant-repository.interface';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { CustomerValidator } from '../../../domain/services/customer-validator.service';
import { CustomerLifecycleManager } from '../../../domain/services/customer-lifecycle-manager.service';
import { CustomerNotFoundException, CustomerInvalidStatusException } from '../../../domain/exceptions/customer.exception';
import { TenantAccessDeniedException } from '../../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class DeactivateCustomerHandler implements CommandHandler<DeactivateCustomerCommand, void> {
  constructor(
    private readonly customerRepository: TenantRepository<Customer, CustomerId>,
    private readonly customerValidator: CustomerValidator,
    private readonly customerLifecycleManager: CustomerLifecycleManager
  ) {}

  /**
   * Handles the DeactivateCustomerCommand
   * @throws CustomerNotFoundException if the customer does not exist
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   * @throws CustomerInvalidStatusException if the customer is already inactive
   */
  async handle(command: DeactivateCustomerCommand): Promise<void> {
    // Find the customer
    const customer = await this.customerRepository.findById(command.customerId, command.tenantContext);

    // Validate that the customer exists
    this.customerValidator.validateCustomerExists(customer, command.customerId);

    // At this point, we know the customer exists
    const existingCustomer = customer!;

    // Validate tenant access
    this.customerValidator.validateTenantAccess(existingCustomer, command.tenantContext);

    // Deactivate the customer
    this.customerLifecycleManager.deactivate(existingCustomer, command.tenantContext);

    // Save the updated customer
    await this.customerRepository.save(existingCustomer, command.tenantContext);
  }
}