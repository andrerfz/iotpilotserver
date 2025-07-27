import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserProfileResult} from '../get-user-profile/get-user-profile.handler';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

export class GetUserProfileQuery extends TenantAwareQuery<UserProfileResult> {
    private constructor(
        public readonly userId: string,
        public readonly customerId: string | undefined,
        tenantContext: TenantContext
    ) {
        super(tenantContext);
    }

    static create(
        userId: string,
        customerId?: string,
        tenantContext?: TenantContext
    ): GetUserProfileQuery {
        const context = tenantContext || TenantContextImpl.createSuperAdmin(UserId.fromString('system'));
        return new GetUserProfileQuery(userId, customerId, context);
    }
}