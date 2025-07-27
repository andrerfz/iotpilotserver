import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';
import {v4 as uuidv4} from 'uuid';

/**
 * Value object representing an API Key identifier
 */
export class ApiKeyId extends ValueObject {
    constructor(private readonly value: string) {
        super();
        this.validate(value);
    }

    getValue(): string {
        return this.value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof ApiKeyId && this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('API Key ID cannot be empty');
        }
        // Accept both UUID format and CUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && 
            !/^[a-z0-9]+$/i.test(value)) {
            throw new Error('Invalid API Key ID format');
        }
    }

    static create(value?: string): ApiKeyId {
        return new ApiKeyId(value || uuidv4());
    }

    static fromString(value: string): ApiKeyId {
        return new ApiKeyId(value);
    }

    static generate(): ApiKeyId {
        return new ApiKeyId(uuidv4());
    }
}


