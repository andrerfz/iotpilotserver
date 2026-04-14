import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class GetCustomerSettingsQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly customerId: string
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
      customerId
    );
  }
}
