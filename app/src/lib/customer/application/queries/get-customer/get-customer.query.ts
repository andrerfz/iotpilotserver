import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class GetCustomerQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly customerId: string
  ) {
    super(tenantContext);
  }
}
