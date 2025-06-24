import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {UserRole} from '../value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

export class UserRegisteredEvent extends DomainEventBase {
    constructor(
        public readonly userId: UserId,
        public readonly email: Email,
        public readonly role: UserRole,
        public readonly customerId: CustomerId | null
    ) {
        super();
    }

    getName(): string {
        return 'UserRegistered';
    }

    getTenantId(): string | null {
        return this.customerId?.getValue() || null;
    }

    isSuperAdminEvent(): boolean {
        return this.role.isSuperAdmin();
    }
}
