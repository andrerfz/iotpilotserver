import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class ListCustomersQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly page?: number,
    public readonly limit?: number
  ) {
    super(tenantContext);
  }
}
