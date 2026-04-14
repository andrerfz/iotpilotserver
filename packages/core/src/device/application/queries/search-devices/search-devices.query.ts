import {TenantAwareQuery} from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export class SearchDevicesQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly searchTerm?: string,
    public readonly ipAddress?: string,
    public readonly status?: string,
    public readonly page: number = 1,
    public readonly limit: number = 50
  ) {
    super(tenantContext);
  }

  static create(
    tenantContext: TenantContext,
    options?: {
      searchTerm?: string;
      ipAddress?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ): SearchDevicesQuery {
    return new SearchDevicesQuery(
      tenantContext,
      options?.searchTerm,
      options?.ipAddress,
      options?.status,
      options?.page ?? 1,
      options?.limit ?? 50
    );
  }
}
