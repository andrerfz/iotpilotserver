import {DomainEvent} from '@/lib/shared/domain/event';
import {User} from '@/lib/user/domain/entities/user.entity';

export class UserUpdatedEvent extends DomainEvent {
    constructor(public readonly user: User) {
        super('UserUpdated');
    }
}


