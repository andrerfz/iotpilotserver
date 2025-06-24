import { v4 as uuidv4 } from 'uuid';

export class DeviceId {
    constructor(private readonly _value: string) {
        if (!_value) {
            throw new Error('Device ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    equals(id: DeviceId): boolean {
        return this._value === id.value;
    }

    static create(): DeviceId {
        return new DeviceId(uuidv4());
    }

    static fromString(id: string): DeviceId {
        return new DeviceId(id);
    }
}