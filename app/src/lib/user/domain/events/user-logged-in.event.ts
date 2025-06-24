import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';

export class UserLoggedInEvent extends DomainEventBase {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly ipAddress: string
    ) {
        super();
    }
}
