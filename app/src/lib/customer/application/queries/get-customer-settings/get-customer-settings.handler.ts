import {GetCustomerSettingsQuery} from './get-customer-settings.query';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';
import {CustomerDto} from '../../queries/list-customers/list-customers.handler';

export class GetCustomerSettingsHandler {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async handle(query: GetCustomerSettingsQuery): Promise<CustomerDto> {
    const customerId = query.customerId;
    const tenantContext = query.getTenantContext();
    
    const customerIdVO = CustomerId.create(customerId);
    const customer = await this.customerRepository.findById(customerIdVO, tenantContext);
    
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    return {
      id: customer.getId().getValue(),
      name: customer.getName().getValue(),
      description: customer.description,
      contactEmail: customer.contactEmail,
      status: customer.getStatus().getValue(),
      isActive: customer.isActive,
      isDeleted: customer.isDeleted(),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}
