export interface EntityInterface<T> {
    getId(): T;

    equals(other: EntityInterface<T>): boolean;
}

export abstract class Entity<T> implements EntityInterface<T> {
    constructor(protected readonly id: T) {
    }

    abstract getId(): T;

    equals(other: EntityInterface<T>): boolean {
        return this.getId() === other.getId();
    }
}