import { TenantAwareQuery } from '../../../../shared/application/queries/tenant-aware-query';
import { TenantContext } from '../../../../shared/application/context/tenant-context.vo';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { Customer } from '../../../domain/entities/customer.entity';

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