import { DeviceId } from '../value-objects/device-id.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';
import { IpAddress } from '../value-objects/ip-address.vo';

export class SSHSession {
    constructor(
        private readonly _id: string,
        private readonly _deviceId: DeviceId,
        private readonly _ipAddress: IpAddress,
        private readonly _sshCredentials: SshCredentials,
        private readonly _startTime: Date,
        private _endTime: Date | null,
        private _isActive: boolean,
        private readonly _commands: string[]
    ) {}

    get id(): string {
        return this._id;
    }

    get deviceId(): DeviceId {
        return this._deviceId;
    }

    get ipAddress(): IpAddress {
        return this._ipAddress;
    }

    get sshCredentials(): SshCredentials {
        return this._sshCredentials;
    }

    get startTime(): Date {
        return this._startTime;
    }

    get endTime(): Date | null {
        return this._endTime;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    get commands(): string[] {
        return [...this._commands];
    }

    addCommand(command: string): void {
        this._commands.push(command);
    }

    closeSession(): void {
        this._isActive = false;
        this._endTime = new Date();
    }

    static create(
        id: string,
        deviceId: DeviceId,
        ipAddress: IpAddress,
        sshCredentials: SshCredentials
    ): SSHSession {
        return new SSHSession(
            id,
            deviceId,
            ipAddress,
            sshCredentials,
            new Date(),
            null,
            true,
            []
        );
    }
}