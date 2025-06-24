import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {UserId} from '../value-objects/user-id.vo';
import {Email} from '../value-objects/email.vo';

export class UserAuthenticatedEvent extends DomainEventBase {
    constructor(
        public readonly userId: UserId,
        public readonly email: Email
    ) {
        super();
    }
}
