import { DeviceId } from '../value-objects/device-id.vo';

export class DeviceMetrics {
    constructor(
        private readonly _deviceId: DeviceId,
        private readonly _cpuUsage: number,
        private readonly _memoryUsage: number,
        private readonly _diskUsage: number,
        private readonly _networkUsage: number,
        private readonly _timestamp: Date
    ) {}

    get deviceId(): DeviceId {
        return this._deviceId;
    }

    get cpuUsage(): number {
        return this._cpuUsage;
    }

    get memoryUsage(): number {
        return this._memoryUsage;
    }

    get diskUsage(): number {
        return this._diskUsage;
    }

    get networkUsage(): number {
        return this._networkUsage;
    }

    get timestamp(): Date {
        return this._timestamp;
    }

    static create(
        deviceId: DeviceId,
        cpuUsage: number,
        memoryUsage: number,
        diskUsage: number,
        networkUsage: number,
        timestamp?: Date
    ): DeviceMetrics {
        return new DeviceMetrics(
            deviceId,
            cpuUsage,
            memoryUsage,
            diskUsage,
            networkUsage,
            timestamp || new Date()
        );
    }
}