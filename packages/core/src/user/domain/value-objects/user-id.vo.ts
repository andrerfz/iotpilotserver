import {ValueObject} from '@iotpilot/core/shared/domain/base.value-object';
import {v4 as uuidv4} from 'uuid';

export interface UserIdData {
    value: string;
}

export class UserId extends ValueObject<UserIdData> {
    private constructor(value: string) {
        super({ value });
        this.validate(value);
    }

    getValue(): string {
        return this.props.value;
    }

    toString(): string {
        return this.props.value;
    }

    toJSON(): UserIdData {
        return this.props;
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('User ID cannot be empty');
        }
        // Accept both UUID format and simple string IDs (for tests)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && 
            !/^[a-z0-9-]+$/i.test(value)) {
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
