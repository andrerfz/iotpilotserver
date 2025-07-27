import {DeactivateCustomerCommand} from './deactivate-customer.command';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';

export class DeactivateCustomerHandler {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async handle(command: DeactivateCustomerCommand): Promise<CustomerEntity> {
    const customerId = command.customerId;
    const tenantContext = command.getTenantContext();
    
    const customerIdVO = CustomerId.create(customerId);
    const customer = await this.customerRepository.findById(customerIdVO, tenantContext);
    
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    customer.deactivate();
    await this.customerRepository.save(customer, tenantContext);
    
    return customer;
  }
}
