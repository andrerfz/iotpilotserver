import { TenantAwareQuery } from '@/lib/shared/application/queries/tenant-aware-query';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { Customer } from '@/lib/customer/domain/entities/customer.entity';
import { CustomerStatusEnum } from '@/lib/customer/domain/value-objects/customer-status.vo';

export interface ListCustomersFilters {
  status?: CustomerStatusEnum;
  nameContains?: string;
  limit?: number;
  offset?: number;
}

export class ListCustomersQuery extends TenantAwareQuery<Customer[]> {
  private constructor(
    tenantContext: TenantContext,
    public readonly filters: ListCustomersFilters = {}
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new ListCustomersQuery
   */
  static create(
    tenantContext: TenantContext,
    filters: ListCustomersFilters = {}
  ): ListCustomersQuery {
    return new ListCustomersQuery(
      tenantContext,
      filters
    );
  }

  /**
   * Gets the status filter
   */
  getStatusFilter(): CustomerStatusEnum | undefined {
    return this.filters.status;
  }

  /**
   * Gets the name contains filter
   */
  getNameContainsFilter(): string | undefined {
    return this.filters.nameContains;
  }

  /**
   * Gets the limit
   */
  getLimit(): number {
    return this.filters.limit || 100; // Default limit
  }

  /**
   * Gets the offset
   */
  getOffset(): number {
    return this.filters.offset || 0; // Default offset
  }

  /**
   * Checks if the query has filters
   */
  hasFilters(): boolean {
    return !!this.filters.status || !!this.filters.nameContains;
  }
}