export interface DomainEvent {
    readonly occurredOn: Date;
    readonly eventId: string;
    readonly eventType: string;
}

export abstract class DomainEventBase implements DomainEvent {
    readonly occurredOn: Date;
    readonly eventId: string;
    readonly eventType: string;

    constructor() {
        this.occurredOn = new Date();
        this.eventId = crypto.randomUUID();
        this.eventType = this.constructor.name;
    }
}