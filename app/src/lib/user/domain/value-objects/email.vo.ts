import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class Email extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
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

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('Email cannot be empty');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new Error('Invalid email format');
        }
    }

    static create(value: string): Email {
        return new Email(value.toLowerCase().trim());
    }

    static fromString(value: string): Email {
        return Email.create(value);
    }
}
