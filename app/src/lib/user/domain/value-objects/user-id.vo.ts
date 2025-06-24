import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class UserId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        if (!value || value.trim().length === 0) {
            throw new Error('UserId cannot be empty');
        }
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof UserId && this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    static create(value: string): UserId {
        return new UserId(value);
    }

    static generate(): UserId {
        return new UserId(crypto.randomUUID());
    }
}