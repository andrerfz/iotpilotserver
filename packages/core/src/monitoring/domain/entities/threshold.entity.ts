import {TenantScopedEntity} from '@iotpilot/core/shared/domain/entities/tenant-scoped.entity';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {ThresholdUpdatedEvent} from '../events/threshold-updated.event';

export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';
export type ThresholdType = 'cpu' | 'memory' | 'disk' | 'temperature' | 'network' | 'custom';

export class Threshold extends TenantScopedEntity<ThresholdId> {
    constructor(
        id: ThresholdId,
        private readonly _deviceId: DeviceId | null, // null means applies to all devices
        private _name: string,
        private _description: string,
        private _metricName: string,
        private _operator: ComparisonOperator,
        private _value: number,
        private _unit: string,
        private _severity: AlertSeverity,
        private _enabled: boolean,
        private _type: ThresholdType,
        private _cooldownMinutes: number,
        private readonly _createdAt: Date,
        private _updatedAt: Date,
        private readonly _metadata: Record<string, any>,
        tenantId: CustomerId
    ) {
        super(id, tenantId);
        if (!_name) {
            throw new Error('Threshold name cannot be empty');
        }
        if (!_metricName) {
            throw new Error('Threshold metric name cannot be empty');
        }
        if (_cooldownMinutes < 0) {
            throw new Error('Threshold cooldown minutes cannot be negative');
        }
    }

    getId(): ThresholdId {
        return this._entityId;
    }

    get id(): ThresholdId {
        return this._entityId;
    }

    get deviceId(): DeviceId | null {
        return this._deviceId;
    }

    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get metricName(): string {
        return this._metricName;
    }

    get operator(): ComparisonOperator {
        return this._operator;
    }

    get value(): number {
        return this._value;
    }

    get unit(): string {
        return this._unit;
    }

    get severity(): AlertSeverity {
        return this._severity;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get type(): ThresholdType {
        return this._type;
    }

    get cooldownMinutes(): number {
        return this._cooldownMinutes;
    }

    get createdAt(): Date {
        return new Date(this._createdAt);
    }

    get updatedAt(): Date {
        return new Date(this._updatedAt);
    }

    get metadata(): Record<string, any> {
        return { ...this._metadata };
    }

    isGlobal(): boolean {
        return this._deviceId === null;
    }

    isEnabled(): boolean {
        return this._enabled;
    }

    enable(): void {
        if (this._enabled) {
            return;
        }
        this._enabled = true;
        this._updatedAt = new Date();
        this.addEvent(new ThresholdUpdatedEvent(this._entityId, this.getTenantId()));
    }

    disable(): void {
        if (!this._enabled) {
            return;
        }
        this._enabled = false;
        this._updatedAt = new Date();
        this.addEvent(new ThresholdUpdatedEvent(this._entityId, this.getTenantId()));
    }

    update(
        name: string,
        description: string,
        metricName: string,
        operator: ComparisonOperator,
        value: number,
        unit: string,
        severity: AlertSeverity,
        type: ThresholdType,
        cooldownMinutes: number
    ): void {
        this._name = name;
        this._description = description;
        this._metricName = metricName;
        this._operator = operator;
        this._value = value;
        this._unit = unit;
        this._severity = severity;
        this._type = type;
        this._cooldownMinutes = cooldownMinutes;
        this._updatedAt = new Date();
        
        this.addEvent(new ThresholdUpdatedEvent(this._entityId, this.getTenantId()));
    }

    evaluateMetric(metricValue: number): boolean {
        switch (this._operator) {
            case '>':
                return metricValue > this._value;
            case '>=':
                return metricValue >= this._value;
            case '<':
                return metricValue < this._value;
            case '<=':
                return metricValue <= this._value;
            case '==':
                return metricValue === this._value;
            case '!=':
                return metricValue !== this._value;
            default:
                throw new Error(`Invalid operator: ${this._operator}`);
        }
    }

    static create(
        id: ThresholdId,
        deviceId: DeviceId | null,
        name: string,
        description: string,
        metricName: string,
        operator: ComparisonOperator,
        value: number,
        unit: string,
        severity: AlertSeverity,
        type: ThresholdType,
        cooldownMinutes: number,
        metadata: Record<string, any>,
        tenantId: CustomerId
    ): Threshold {
        const now = new Date();
        return new Threshold(
            id,
            deviceId,
            name,
            description,
            metricName,
            operator,
            value,
            unit,
            severity,
            true, // enabled by default
            type,
            cooldownMinutes,
            now,
            now,
            metadata,
            tenantId
        );
    }
}