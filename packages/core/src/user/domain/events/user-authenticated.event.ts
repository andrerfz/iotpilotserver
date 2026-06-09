import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class UserAuthenticatedEvent extends DomainEventBase {
    constructor(
        public readonly userId: UserId,
        public readonly email: Email,
        public readonly customerId: CustomerId | null = null,
    ) {
        super();
    }
}
