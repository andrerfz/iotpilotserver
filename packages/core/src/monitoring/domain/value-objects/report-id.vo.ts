import {v4 as uuidv4} from 'uuid';
import {ValueObject} from '@iotpilot/core/shared/domain/interfaces/value-object.interface';

export class ReportId extends ValueObject {
    constructor(private readonly _value: string) {
        super();
        if (!_value) {
            throw new Error('Report ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    getValue(): string {
        return this._value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof ReportId && this._value === (other as ReportId).value;
    }

    static create(id?: string): ReportId {
        return new ReportId(id || uuidv4());
    }

    static fromString(id: string): ReportId {
        return new ReportId(id);
    }
}