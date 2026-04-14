import {TenantScopedEntity} from '@iotpilot/core/shared/domain/entities/tenant-scoped.entity';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {v4 as uuidv4} from 'uuid';
import {TimeRange} from '../value-objects/time-range.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {ReportGeneratedEvent} from '../events/report-generated.event';

export type ReportFormat = 'pdf' | 'csv' | 'json' | 'html';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ReportType = 'system_health' | 'system' | 'device' | 'performance' | 'alerts' | 'custom';

export class MonitoringReportId {
    constructor(private readonly _value: string) {
        if (!_value) {
            throw new Error('Report ID cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    equals(other: MonitoringReportId): boolean {
        return this._value === other.value;
    }

    static create(id?: string): MonitoringReportId {
        return new MonitoringReportId(id || uuidv4());
    }
}

export class MonitoringReport extends TenantScopedEntity<MonitoringReportId> {
    constructor(
        id: MonitoringReportId,
        private readonly _name: string,
        private readonly _description: string,
        private readonly _type: ReportType,
        private readonly _timeRange: TimeRange,
        private readonly _deviceIds: DeviceId[],
        private readonly _format: ReportFormat,
        private _status: ReportStatus,
        private _url: string | null,
        private _error: string | null,
        private readonly _createdAt: Date,
        private _completedAt: Date | null,
        private readonly _createdBy: string,
        private readonly _parameters: Record<string, any>,
        tenantId: CustomerId
    ) {
        super(id, tenantId);
        if (!_name) {
            throw new Error('Report name cannot be empty');
        }
        if (!_type) {
            throw new Error('Report type cannot be empty');
        }
    }

    getId(): MonitoringReportId {
        return this._entityId;
    }

    get id(): MonitoringReportId {
        return this._entityId;
    }

    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get type(): ReportType {
        return this._type;
    }

    get timeRange(): TimeRange {
        return this._timeRange;
    }

    get deviceIds(): DeviceId[] {
        return [...this._deviceIds];
    }

    get format(): ReportFormat {
        return this._format;
    }

    get status(): ReportStatus {
        return this._status;
    }

    get url(): string | null {
        return this._url;
    }

    get error(): string | null {
        return this._error;
    }

    get createdAt(): Date {
        return new Date(this._createdAt);
    }

    get completedAt(): Date | null {
        return this._completedAt ? new Date(this._completedAt) : null;
    }

    get createdBy(): string {
        return this._createdBy;
    }

    get parameters(): Record<string, any> {
        return { ...this._parameters };
    }

    isPending(): boolean {
        return this._status === 'pending';
    }

    isGenerating(): boolean {
        return this._status === 'generating';
    }

    isCompleted(): boolean {
        return this._status === 'completed';
    }

    isFailed(): boolean {
        return this._status === 'failed';
    }

    markAsGenerating(): void {
        if (this._status !== 'pending') {
            throw new Error(`Cannot mark report as generating from status: ${this._status}`);
        }
        this._status = 'generating';
    }

    markAsCompleted(url: string): void {
        if (this._status !== 'generating') {
            throw new Error(`Cannot mark report as completed from status: ${this._status}`);
        }
        this._status = 'completed';
        this._url = url;
        this._completedAt = new Date();

        this.addEvent(new ReportGeneratedEvent(
            this._type,
            this.getTenantId(),
            this._deviceIds.length > 0 ? this._deviceIds[0] : undefined
        ));
    }

    markAsFailed(error: string): void {
        if (this._status !== 'generating' && this._status !== 'pending') {
            throw new Error(`Cannot mark report as failed from status: ${this._status}`);
        }
        this._status = 'failed';
        this._error = error;
    }

    static create(
        id: MonitoringReportId,
        name: string,
        description: string,
        type: ReportType,
        timeRange: TimeRange,
        deviceIds: DeviceId[],
        format: ReportFormat,
        createdBy: string,
        parameters: Record<string, any>,
        tenantId: CustomerId
    ): MonitoringReport {
        return new MonitoringReport(
            id,
            name,
            description,
            type,
            timeRange,
            deviceIds,
            format,
            'pending',
            null,
            null,
            new Date(),
            null,
            createdBy,
            parameters,
            tenantId
        );
    }
}