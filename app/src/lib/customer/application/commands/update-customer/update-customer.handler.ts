import { Injectable } from '@nestjs/common';
import { CommandHandler } from '@/lib/shared/application/interfaces/command.interface';
import { UpdateCustomerCommand } from './update-customer.command';
import { TenantRepository } from '@/lib/shared/domain/interfaces/tenant-repository.interface';
import { Customer } from '@/lib/customer/domain/entities/customer.entity';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerValidator } from '@/lib/customer/domain/services/customer-validator.service';
import { OrganizationManager } from '@/lib/customer/domain/services/organization-manager.service';
import { CustomerNotFoundException } from '@/lib/customer/domain/exceptions/customer.exception';
import { TenantAccessDeniedException } from '@/lib/shared/domain/exceptions/tenant.exception';

@Injectable()
export class UpdateCustomerHandler implements CommandHandler<UpdateCustomerCommand, void> {
  constructor(
    private readonly customerRepository: TenantRepository<Customer, CustomerId>,
    private readonly customerValidator: CustomerValidator,
    private readonly organizationManager: OrganizationManager
  ) {}

  /**
   * Handles the UpdateCustomerCommand
   * @throws CustomerNotFoundException if the customer does not exist
   * @throws TenantAccessDeniedException if the tenant context does not have access to the customer
   */
  async handle(command: UpdateCustomerCommand): Promise<void> {
    // Validate that the command has at least one update
    command.validateHasUpdates();

    // Find the customer
    const customer = await this.customerRepository.findById(command.customerId, command.tenantContext);

    // Validate that the customer exists
    this.customerValidator.validateCustomerExists(customer, command.customerId);

    // At this point, we know the customer exists
    const existingCustomer = customer!;

    // Validate tenant access
    this.customerValidator.validateTenantAccess(existingCustomer, command.tenantContext);

    // Validate that the customer is active
    this.customerValidator.validateCustomerIsActive(existingCustomer);

    // Update the customer name if provided
    if (command.hasNameUpdate()) {
      existingCustomer.updateName(command.customerName!);
    }

    // Update the customer settings if provided
    if (command.hasSettingsUpdate()) {
      this.organizationManager.updateSettings(
        existingCustomer,
        command.settings!.toObject(),
        command.tenantContext
      );
    }

    // Save the updated customer
    await this.customerRepository.save(existingCustomer, command.tenantContext);
  }
}