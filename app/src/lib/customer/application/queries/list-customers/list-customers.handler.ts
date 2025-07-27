import {ListCustomersQuery} from './list-customers.query';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';

export interface CustomerDto {
  id: string;
  name: string;
  description?: string;
  contactEmail?: string;
  status: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ListCustomersHandler {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async handle(query: ListCustomersQuery): Promise<CustomerDto[]> {
    const tenantContext = query.getTenantContext();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    
    const customers = await this.customerRepository.findAll(tenantContext);

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedCustomers = customers.slice(start, start + limit);

    return paginatedCustomers.map((customer: CustomerEntity) => ({
      id: customer.getId().getValue(),
      name: customer.getName().getValue(),
      description: customer.description,
      contactEmail: customer.contactEmail,
      status: customer.getStatus().getValue(),
      isActive: customer.isActive,
      isDeleted: customer.isDeleted(),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    }));
  }
}
