import {UpdateCustomerCommand} from './update-customer.command';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerName} from '../../../domain/value-objects/customer-name.vo';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';

export class UpdateCustomerHandler {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async handle(command: UpdateCustomerCommand): Promise<CustomerEntity> {
    const { customerId, name, description, contactEmail } = command;
    const tenantContext = command.getTenantContext();
    
    const customerIdVO = CustomerId.create(customerId);
    const customer = await this.customerRepository.findById(customerIdVO, tenantContext);
    
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    if (name) {
      const customerName = CustomerName.create(name);
      customer.updateName(customerName);
    }

    if (contactEmail !== undefined) {
      customer.updateContact(contactEmail);
    }

    if (description !== undefined) {
      customer.updateDescription(description);
    }

    await this.customerRepository.save(customer, tenantContext);
    
    return customer;
  }
}
