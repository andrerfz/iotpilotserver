export class DeviceName {
    constructor(private readonly _value: string) {
        if (!_value) {
            throw new Error('Device name cannot be empty');
        }
        
        if (_value.length < 3) {
            throw new Error('Device name must be at least 3 characters long');
        }
        
        if (_value.length > 50) {
            throw new Error('Device name cannot exceed 50 characters');
        }
    }

    get value(): string {
        return this._value;
    }

    equals(name: DeviceName): boolean {
        return this._value === name.value;
    }

    static create(name: string): DeviceName {
        return new DeviceName(name);
    }
}