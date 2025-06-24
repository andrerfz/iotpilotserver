import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class Email extends ValueObject {
    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    constructor(private readonly value: string) {
        super();
        if (!Email.EMAIL_REGEX.test(value)) {
            throw new Error(`Invalid email format: ${value}`);
        }
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof Email && this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    static create(value: string): Email {
        return new Email(value.toLowerCase().trim());
    }
}