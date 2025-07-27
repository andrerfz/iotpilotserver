import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

/**
 * Query to list API keys for a specific user
 * Extends TenantAwareQuery for proper tenant isolation
 */
export class ListApiKeysQuery extends TenantAwareQuery<any> {
    /** Static type identifier that survives minification */
    static readonly type = 'ListApiKeysQuery';

    constructor(
        public readonly userId: string,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(userId: string, tenantContext: TenantContext): ListApiKeysQuery {
        return new ListApiKeysQuery(userId, tenantContext);
    }
}