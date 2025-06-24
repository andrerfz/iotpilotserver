export interface DomainEvent {
    readonly occurredOn: Date;
    readonly eventName: string;
}

export interface EventBus {
    publish(event: DomainEvent): Promise<void>;

    subscribe<T extends DomainEvent>(
        eventType: string,
        handler: (event: T) => Promise<void>
    ): void;
}

export class InMemoryEventBus implements EventBus {
    private subscribers = new Map<string, Array<(event: any) => Promise<void>>>();

    subscribe<T extends DomainEvent>(
        eventType: string,
        handler: (event: T) => Promise<void>
    ): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType)!.push(handler);
    }

    async publish(event: DomainEvent): Promise<void> {
        const handlers = this.subscribers.get(event.constructor.name) || [];
        await Promise.all(handlers.map(handler => handler(event)));
    }
}