import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class ListCustomersQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly page?: number,
    public readonly limit?: number
  ) {
    super(tenantContext);
  }
}
