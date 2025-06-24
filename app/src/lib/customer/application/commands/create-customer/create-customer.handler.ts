import { Injectable } from '@nestjs/common';
import { CommandHandler } from '../../../../shared/application/interfaces/command.interface';
import { CreateCustomerCommand } from './create-customer.command';
import { CustomerCreator } from '../../../domain/services/customer-creator.service';
import { TenantRepository } from '../../../../shared/domain/interfaces/tenant-repository.interface';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { CustomerAlreadyExistsException } from '../../../domain/exceptions/customer.exception';
import { TenantAccessDeniedException } from '../../../../shared/domain/exceptions/tenant.exception';

@Injectable()
export class CreateCustomerHandler implements CommandHandler<CreateCustomerCommand, void> {
  constructor(
    private readonly customerCreator: CustomerCreator,
    private readonly customerRepository: TenantRepository<Customer, CustomerId>
  ) {}

  /**
   * Handles the CreateCustomerCommand
   * @throws CustomerAlreadyExistsException if a customer with the same ID already exists
   * @throws TenantAccessDeniedException if the tenant context does not have permission to create customers
   */
  async handle(command: CreateCustomerCommand): Promise<void> {
    // Only super admins can create customers
    if (!command.canBypassTenantRestrictions()) {
      throw new TenantAccessDeniedException(
        command.tenantContext.getUserId().toString(),
        command.customerId,
        'Only super admins can create customers'
      );
    }

    // Check if customer already exists
    const exists = await this.customerRepository.existsInTenant(
      command.customerId,
      command.customerId // Customer ID is the same as tenant ID for customers
    );

    // Validate that customer does not exist
    this.customerCreator.validateCustomerDoesNotExist(command.customerId, exists);

    // Create the customer
    const customer = this.customerCreator.create(
      command.customerId,
      command.customerName,
      command.settings,
      command.tenantContext
    );

    // Save the customer
    await this.customerRepository.save(customer, command.tenantContext);
  }
}