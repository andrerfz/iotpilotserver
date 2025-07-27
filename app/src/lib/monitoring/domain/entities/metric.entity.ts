import {TenantScopedEntity} from '@/lib/shared/domain/entities/tenant-scoped.entity';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {MetricId} from '../value-objects/metric-id.vo';
import {MetricValue} from '../value-objects/metric-value.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';

export class Metric extends TenantScopedEntity<MetricId> {
    constructor(
        id: MetricId,
        private readonly _deviceId: DeviceId,
        private readonly _name: string,
        private readonly _value: MetricValue,
        private readonly _timestamp: Date,
        private readonly _tags: Map<string, string>,
        tenantId: CustomerId
    ) {
        super(id, tenantId);
        if (!_name) {
            throw new Error('Metric name cannot be empty');
        }
        if (!_timestamp) {
            throw new Error('Metric timestamp cannot be empty');
        }
    }

    getId(): MetricId {
        return this._entityId;
    }

    get id(): MetricId {
        return this._entityId;
    }

    get deviceId(): DeviceId {
        return this._deviceId;
    }

    get name(): string {
        return this._name;
    }

    get value(): MetricValue {
        return this._value;
    }

    get timestamp(): Date {
        return new Date(this._timestamp);
    }

    get tags(): Map<string, string> {
        return new Map(this._tags);
    }

    hasTag(key: string): boolean {
        return this._tags.has(key);
    }

    getTag(key: string): string | undefined {
        return this._tags.get(key);
    }

    static create(
        id: MetricId,
        deviceId: DeviceId,
        name: string,
        value: MetricValue,
        timestamp: Date,
        tags: Map<string, string>,
        tenantId: CustomerId
    ): Metric {
        return new Metric(
            id,
            deviceId,
            name,
            value,
            timestamp,
            tags,
            tenantId
        );
    }
}