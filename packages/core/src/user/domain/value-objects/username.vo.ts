import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';

export class Username extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof Username && this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('Username cannot be empty');
        }
        
        // Username should be at least 3 characters
        if (value.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }
        
        // Username should not exceed 50 characters
        if (value.length > 50) {
            throw new Error('Username cannot exceed 50 characters');
        }
        
        // Username should only contain alphanumeric characters, hyphens, and underscores
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(value)) {
            throw new Error('Username can only contain letters, numbers, hyphens, and underscores');
        }
    }

    static create(value: string): Username {
        return new Username(value.trim());
    }
}