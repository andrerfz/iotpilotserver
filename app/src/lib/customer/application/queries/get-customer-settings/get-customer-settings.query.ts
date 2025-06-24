import { TenantAwareQuery } from '../../../../shared/application/queries/tenant-aware-query';
import { TenantContext } from '../../../../shared/application/context/tenant-context.vo';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { OrganizationSettings } from '../../../domain/value-objects/organization-settings.vo';

export class GetCustomerSettingsQuery extends TenantAwareQuery<OrganizationSettings | null> {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId
  ) {
    super(tenantContext);
  }

  /**
   * Factory method to create a new GetCustomerSettingsQuery
   */
  static create(
    tenantContext: TenantContext,
    customerId: string
  ): GetCustomerSettingsQuery {
    return new GetCustomerSettingsQuery(
      tenantContext,
      new CustomerId(customerId)
    );
  }
}