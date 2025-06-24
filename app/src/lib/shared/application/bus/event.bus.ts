import {DomainEvent} from '@/lib/shared/domain/events/domain.event';

export interface EventHandler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
}

export interface EventBus {
    publish(event: DomainEvent): Promise<void>;

    publishAll(events: DomainEvent[]): Promise<void>;

    subscribe<T extends DomainEvent>(
        eventType: string,
        handler: EventHandler<T> | ((event: T) => Promise<void>)
    ): void;
}

export class InMemoryEventBus implements EventBus {
    private subscribers = new Map<string, (EventHandler<any> | ((event: any) => Promise<void>))[]>();

    subscribe<T extends DomainEvent>(
        eventType: string,
        handler: EventHandler<T> | ((event: T) => Promise<void>)
    ): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType)!.push(handler);
    }

    async publish(event: DomainEvent): Promise<void> {
        // Get the event type from eventType property
        const eventTypeName = event.eventType || event.constructor.name;
        const handlers = this.subscribers.get(eventTypeName) || [];

        await Promise.all(handlers.map(handler => {
            if (typeof handler === 'function') {
                return handler(event);
            } else {
                return handler.handle(event);
            }
        }));
    }

    async publishAll(events: DomainEvent[]): Promise<void> {
        for (const event of events) {
            await this.publish(event);
        }
    }
}
