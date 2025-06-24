import { Injectable } from '@nestjs/common';
import { QueryHandler } from '../../../../shared/application/interfaces/query.interface';
import { ListCustomersQuery } from './list-customers.query';
import { TenantRepository } from '../../../../shared/domain/interfaces/tenant-repository.interface';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { TenantDataSegregationService } from '../../../domain/services/tenant-data-segregation.service';

@Injectable()
export class ListCustomersHandler implements QueryHandler<ListCustomersQuery, Customer[]> {
  constructor(
    private readonly customerRepository: TenantRepository<Customer, CustomerId>,
    private readonly tenantDataSegregationService: TenantDataSegregationService
  ) {}

  /**
   * Handles the ListCustomersQuery
   * Returns a list of customers filtered by the query filters and tenant context
   */
  async handle(query: ListCustomersQuery): Promise<Customer[]> {
    // Get all customers
    const allCustomers = await this.customerRepository.findAll(query.tenantContext);

    // Filter customers by tenant
    let filteredCustomers = this.tenantDataSegregationService.filterDataByTenant(
      allCustomers,
      query.tenantContext
    );

    // Apply status filter if provided
    if (query.getStatusFilter()) {
      filteredCustomers = filteredCustomers.filter(
        customer => customer.getStatus().getValue() === query.getStatusFilter()
      );
    }

    // Apply name filter if provided
    if (query.getNameContainsFilter()) {
      const nameFilter = query.getNameContainsFilter()!.toLowerCase();
      filteredCustomers = filteredCustomers.filter(
        customer => customer.getName().getValue().toLowerCase().includes(nameFilter)
      );
    }

    // Apply pagination
    const offset = query.getOffset();
    const limit = query.getLimit();
    
    return filteredCustomers.slice(offset, offset + limit);
  }
}