import { v4 as uuidv4 } from 'uuid';
import { ValueObject } from '@/lib/shared/domain/interfaces/value-object.interface';

export class DeviceId extends ValueObject {
    constructor(private readonly _value: string) {
        super();
        if (!_value) {
            throw new Error('Device ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    getValue(): string {
        return this._value;
    }

    equals(other: ValueObject): boolean {
        return other instanceof DeviceId && this._value === (other as DeviceId).value;
    }

    static create(): DeviceId {
        return new DeviceId(uuidv4());
    }

    static fromString(id: string): DeviceId {
        return new DeviceId(id);
    }
}
