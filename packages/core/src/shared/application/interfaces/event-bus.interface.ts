import {DomainEvent} from '@iotpilot/core/shared/domain/event';

export interface EventBus {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: DomainEvent[]): Promise<void>;
}


