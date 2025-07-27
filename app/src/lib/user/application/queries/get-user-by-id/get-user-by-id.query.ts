import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext, TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {User} from '@/lib/user/domain/entities/user.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

export class GetUserByIdQuery extends TenantAwareQuery<User> {
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
    ): GetUserByIdQuery {
        const context = tenantContext || TenantContextImpl.createSuperAdmin(UserId.fromString('system'));
        return new GetUserByIdQuery(userId, customerId, context);
    }
}