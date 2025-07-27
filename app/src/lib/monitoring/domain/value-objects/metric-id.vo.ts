import {v4 as uuidv4} from 'uuid';
import {ValueObject} from '@/lib/shared/domain/interfaces/value-object.interface';

export class MetricId extends ValueObject {
    constructor(private readonly _value: string) {
        super();
        if (!_value) {
            throw new Error('Metric ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    getValue(): string {
        return this._value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof MetricId && this._value === (other as MetricId).value;
    }

    static create(id?: string): MetricId {
        return new MetricId(id || uuidv4());
    }

    static fromString(id: string): MetricId {
        return new MetricId(id);
    }
}