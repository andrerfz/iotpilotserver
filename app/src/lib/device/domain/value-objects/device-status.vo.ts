export type DeviceStatusValue = 'active' | 'inactive' | 'maintenance' | 'error';

import { ValueObject } from '@/lib/shared/domain/interfaces/value-object.interface';

export class DeviceStatus extends ValueObject {
    constructor(private readonly _value: DeviceStatusValue) {
        super();
        if (!_value) {
            throw new Error('Device status cannot be empty');
        }

        const validStatuses: DeviceStatusValue[] = ['active', 'inactive', 'maintenance', 'error'];
        if (!validStatuses.includes(_value)) {
            throw new Error(`Invalid device status: ${_value}`);
        }
    }

    get value(): DeviceStatusValue {
        return this._value;
    }

    getValue(): DeviceStatusValue {
        return this._value;
    }

    isActive(): boolean {
        return this._value === 'active';
    }

    isInactive(): boolean {
        return this._value === 'inactive';
    }

    isInMaintenance(): boolean {
        return this._value === 'maintenance';
    }

    isInError(): boolean {
        return this._value === 'error';
    }

    equals(other: ValueObject): boolean {
        return other instanceof DeviceStatus && this._value === (other as DeviceStatus).value;
    }

    static create(status: DeviceStatusValue): DeviceStatus {
        return new DeviceStatus(status);
    }
}
