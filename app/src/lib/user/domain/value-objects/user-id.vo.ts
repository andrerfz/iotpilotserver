import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';
import {v4 as uuidv4} from 'uuid';

export class UserId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
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

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('User ID cannot be empty');
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            throw new Error('Invalid User ID format');
        }
    }

    static create(value?: string): UserId {
        return new UserId(value || uuidv4());
    }

    static fromString(value: string): UserId {
        return new UserId(value);
    }

    static generate(): UserId {
        return new UserId(uuidv4());
    }
}
