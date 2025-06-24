import { DeviceId } from '../value-objects/device-id.vo';

export enum CommandStatus {
    PENDING = 'pending',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export class DeviceCommand {
    constructor(
        private readonly _id: string,
        private readonly _deviceId: DeviceId,
        private readonly _command: string,
        private _status: CommandStatus,
        private _output: string | null,
        private _error: string | null,
        private readonly _createdAt: Date,
        private _executedAt: Date | null,
        private _completedAt: Date | null
    ) {}

    get id(): string {
        return this._id;
    }

    get deviceId(): DeviceId {
        return this._deviceId;
    }

    get command(): string {
        return this._command;
    }

    get status(): CommandStatus {
        return this._status;
    }

    get output(): string | null {
        return this._output;
    }

    get error(): string | null {
        return this._error;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get executedAt(): Date | null {
        return this._executedAt;
    }

    get completedAt(): Date | null {
        return this._completedAt;
    }

    markAsExecuting(): void {
        this._status = CommandStatus.EXECUTING;
        this._executedAt = new Date();
    }

    markAsCompleted(output: string): void {
        this._status = CommandStatus.COMPLETED;
        this._output = output;
        this._completedAt = new Date();
    }

    markAsFailed(error: string): void {
        this._status = CommandStatus.FAILED;
        this._error = error;
        this._completedAt = new Date();
    }

    static create(
        id: string,
        deviceId: DeviceId,
        command: string
    ): DeviceCommand {
        return new DeviceCommand(
            id,
            deviceId,
            command,
            CommandStatus.PENDING,
            null,
            null,
            new Date(),
            null,
            null
        );
    }
}