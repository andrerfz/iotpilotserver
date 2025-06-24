import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { DeviceStatus } from '../value-objects/device-status.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';

export class Device {
    constructor(
        private readonly _id: DeviceId,
        private _name: DeviceName,
        private _ipAddress: IpAddress,
        private _status: DeviceStatus,
        private _sshCredentials: SshCredentials,
        private readonly _createdAt: Date,
        private _updatedAt: Date
    ) {}

    get id(): DeviceId {
        return this._id;
    }

    get name(): DeviceName {
        return this._name;
    }

    get ipAddress(): IpAddress {
        return this._ipAddress;
    }

    get status(): DeviceStatus {
        return this._status;
    }

    get sshCredentials(): SshCredentials {
        return this._sshCredentials;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    updateName(name: DeviceName): void {
        this._name = name;
        this._updatedAt = new Date();
    }

    updateIpAddress(ipAddress: IpAddress): void {
        this._ipAddress = ipAddress;
        this._updatedAt = new Date();
    }

    updateStatus(status: DeviceStatus): void {
        this._status = status;
        this._updatedAt = new Date();
    }

    updateSshCredentials(sshCredentials: SshCredentials): void {
        this._sshCredentials = sshCredentials;
        this._updatedAt = new Date();
    }

    static create(
        id: DeviceId,
        name: DeviceName,
        ipAddress: IpAddress,
        sshCredentials: SshCredentials
    ): Device {
        const now = new Date();
        return new Device(
            id,
            name,
            ipAddress,
            DeviceStatus.create('inactive'),
            sshCredentials,
            now,
            now
        );
    }
}