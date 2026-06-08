import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {User} from '@iotpilot/core/user/domain/entities/user.entity';

export class UserUpdatedEvent extends DomainEventBase {
    constructor(public readonly user: User) {
        super();
    }
}


