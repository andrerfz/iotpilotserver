export type DeviceStatusValue = 'active' | 'inactive' | 'maintenance' | 'error';

export class DeviceStatus {
    constructor(private readonly _value: DeviceStatusValue) {
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

    equals(status: DeviceStatus): boolean {
        return this._value === status.value;
    }

    static create(status: DeviceStatusValue): DeviceStatus {
        return new DeviceStatus(status);
    }
}