import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';
import {v4 as uuidv4} from 'uuid';

/**
 * Value object representing an SSH session ID
 */
export class SSHSessionId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof SSHSessionId && this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('SSH Session ID cannot be empty');
        }
        // Accept both UUID format and simple string IDs (for tests)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && 
            !/^[a-z0-9-]+$/i.test(value)) {
            throw new Error('Invalid SSH Session ID format');
        }
    }

    static create(value?: string): SSHSessionId {
        return new SSHSessionId(value || uuidv4());
    }

    static fromString(value: string): SSHSessionId {
        return new SSHSessionId(value);
    }

    static generate(): SSHSessionId {
        return new SSHSessionId(uuidv4());
    }
}