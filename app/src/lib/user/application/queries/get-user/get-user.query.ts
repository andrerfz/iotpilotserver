import {TenantAwareQuery} from '../../../../shared/application/queries/tenant-aware-query';
import {TenantContext} from '../../../../shared/domain/tenant-context';

export class GetUserQuery extends TenantAwareQuery<any> {
  constructor(
    public readonly userId: string,
    tenantContext: TenantContext
  ) {
    super(tenantContext);
  }

  static fromRequest(request: any, tenantContext: TenantContext): GetUserQuery {
    const { userId } = request.params || request.query;
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    return new GetUserQuery(userId, tenantContext);
  }
}
