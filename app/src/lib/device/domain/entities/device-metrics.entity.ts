import { DeviceId } from '../value-objects/device-id.vo';

export class DeviceMetrics {
    constructor(
        private readonly _deviceId: DeviceId,
        private readonly _cpuUsage: number,
        private readonly _memoryUsage: number,
        private readonly _diskUsage: number,
        private readonly _networkUpload: number,
        private readonly _networkDownload: number,
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

    get networkUpload(): number {
        return this._networkUpload;
    }

    get networkDownload(): number {
        return this._networkDownload;
    }

    get timestamp(): Date {
        return this._timestamp;
    }

    get networkUsage(): number {
        return this._networkUpload + this._networkDownload;
    }

    static create(
        deviceId: DeviceId,
        cpuUsage: number,
        memoryUsage: number,
        diskUsage: number,
        networkUpload: number,
        networkDownload: number,
        timestamp?: Date
    ): DeviceMetrics {
        return new DeviceMetrics(
            deviceId,
            cpuUsage,
            memoryUsage,
            diskUsage,
            networkUpload,
            networkDownload,
            timestamp || new Date()
        );
    }
}
