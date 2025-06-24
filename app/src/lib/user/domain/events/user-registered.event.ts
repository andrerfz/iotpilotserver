import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';

export class UserRegisteredEvent extends DomainEventBase {
    constructor(
        public readonly userId: string,
        public readonly email: string
    ) {
        super();
    }
}
