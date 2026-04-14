import {DomainEvent} from '@iotpilot/core/shared/domain/event';
import {User} from '@iotpilot/core/user/domain/entities/user.entity';

export class UserUpdatedEvent extends DomainEvent {
    constructor(public readonly user: User) {
        super('UserUpdated');
    }
}


