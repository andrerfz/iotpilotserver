import {GetCustomerByDomainQuery} from './get-customer-by-domain.query';
import {CustomerDto} from '../../queries/list-customers/list-customers.handler';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';

export class GetCustomerByDomainHandler {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async handle(query: GetCustomerByDomainQuery): Promise<CustomerDto> {
    const domain = query.domain;
    const tenantContext = query.getTenantContext();
    
    const customer = await this.customerRepository.findByDomain(domain, tenantContext);
    
    if (!customer) {
      throw new Error(`Customer with domain ${domain} not found`);
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
