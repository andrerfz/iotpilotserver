import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class ListUsersQuery extends TenantAwareQuery<any> {
  constructor(
    tenantContext: TenantContext,
    public readonly page?: number,
    public readonly limit?: number,
    public readonly role?: string,
    public readonly isActive?: boolean,
    public readonly searchTerm?: string
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): ListUsersQuery {
    const { 
      page = 1, 
      limit = 50, 
      role, 
      active, 
      search 
    } = request.query;

    return new ListUsersQuery(
      tenantContext,
      parseInt(page) || 1,
      parseInt(limit) || 50,
      role,
      active !== undefined ? active === 'true' : undefined,
      search
    );
  }
}