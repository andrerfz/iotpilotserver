import {Query} from '@/lib/shared/application/interfaces/query.interface';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export class GetCurrentUserQuery implements Query {
    private constructor(
        public readonly userId: UserId,
        public readonly customerId: CustomerId | null
    ) {}

    static create(
        userId: string,
        customerId?: string
    ): GetCurrentUserQuery {
        return new GetCurrentUserQuery(
            UserId.fromString(userId),
            customerId ? CustomerId.create(customerId) : null
        );
    }

    static createForTenant(
        userId: string,
        customerId: string
    ): GetCurrentUserQuery {
        return new GetCurrentUserQuery(
            UserId.fromString(userId),
            CustomerId.create(customerId)
        );
    }

    static createSuperAdmin(
        userId: string
    ): GetCurrentUserQuery {
        return new GetCurrentUserQuery(
            UserId.fromString(userId),
            null
        );
    }
}
