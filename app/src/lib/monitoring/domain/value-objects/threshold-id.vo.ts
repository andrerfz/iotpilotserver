import {v4 as uuidv4} from 'uuid';
import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class ThresholdId extends ValueObject {
    constructor(private readonly _value: string) {
        super();
        if (!_value) {
            throw new Error('Threshold ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    getValue(): string {
        return this._value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof ThresholdId && this._value === (other as ThresholdId).value;
    }

    static create(id?: string): ThresholdId {
        return new ThresholdId(id || uuidv4());
    }

    static fromString(id: string): ThresholdId {
        return new ThresholdId(id);
    }
}