import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '../value-objects/user-id.vo';

export class UserLoggedOutEvent extends TenantScopedEventBase {
    public readonly eventName = 'user.logged-out';

    constructor(
        public readonly userId: UserId,
        public readonly sessionToken?: string,
        tenantCustomerId?: string
    ) {
        // Convert string to CustomerId or create a default one for superadmin
        const tenantId = tenantCustomerId 
            ? CustomerId.create(tenantCustomerId)
            : CustomerId.create('superadmin');
        super(tenantId);
    }

    getAggregateId(): string {
        return this.userId.getValue();
    }

    getEventData(): Record<string, any> {
        return {
            userId: this.userId.getValue(),
            sessionToken: this.sessionToken,
            tenantCustomerId: this.tenantId.getValue(),
            loggedOutAt: this.occurredOn.toISOString()
        };
    }
}