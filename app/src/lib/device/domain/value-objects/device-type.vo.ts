export enum DeviceTypeEnum {
    ROUTER = 'router',
    SWITCH = 'switch',
    SERVER = 'server',
    GATEWAY = 'gateway',
    SENSOR = 'sensor',
    CAMERA = 'camera',
    OTHER = 'other'
}

export class DeviceType {
    private constructor(private readonly value: DeviceTypeEnum) {}

    get getValue(): DeviceTypeEnum {
        return this.value;
    }

    static create(value: string): DeviceType {
        if (!DeviceType.isValid(value)) {
            throw new Error(`Invalid device type: ${value}`);
        }
        return new DeviceType(value as DeviceTypeEnum);
    }

    static isValid(value: string): boolean {
        return Object.values(DeviceTypeEnum).includes(value as DeviceTypeEnum);
    }

    equals(other: DeviceType): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }
}