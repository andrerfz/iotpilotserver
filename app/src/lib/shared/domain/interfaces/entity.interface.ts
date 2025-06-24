export interface EntityInterface<T> {
    getId(): T;

    equals(other: EntityInterface<T>): boolean;
}

export abstract class Entity<T> implements EntityInterface<T> {
    private events: any[] = [];

    constructor(protected readonly id: T) {
    }

    abstract getId(): T;

    equals(other: EntityInterface<T>): boolean {
        return this.getId() === other.getId();
    }

    addEvent(event: any): void {
        this.events.push(event);
    }

    getEvents(): any[] {
        return this.events;
    }

    clearEvents(): void {
        this.events = [];
    }
}
