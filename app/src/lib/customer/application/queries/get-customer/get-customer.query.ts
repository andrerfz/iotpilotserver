import { TenantAwareQuery } from '@/lib/shared/application/queries/tenant-aware-query';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { Customer } from '@/lib/customer/domain/entities/customer.entity';

export class GetCustomerQuery extends TenantAwareQuery<Customer | null> {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new GetCustomerQuery
   */
  static create(
    tenantContext: TenantContext,
    customerId: string
  ): GetCustomerQuery {
    return new GetCustomerQuery(
      tenantContext,
      new CustomerId(customerId)
    );
  }
}