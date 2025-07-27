import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class GetCustomerByDomainQuery extends TenantAwareQuery<any> {
  /** Static type identifier that survives minification */
  static readonly type = 'GetCustomerByDomainQuery';

  constructor(
    public readonly domain: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }

  static create(domain: string, tenantContext: TenantContext): GetCustomerByDomainQuery {
    return new GetCustomerByDomainQuery(domain, tenantContext);
  }
}
