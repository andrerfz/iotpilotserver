import {Query} from '@/lib/shared/application/interfaces/query.interface';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';
import {AlertSeverity, SeverityLevel} from '../../../domain/value-objects/alert-severity.vo';
import {AlertStatus, StatusType} from '../../../domain/value-objects/alert-status.vo';

export class ListAlertsQuery implements Query {
    private constructor(
        public readonly tenantId: CustomerId,
        public readonly deviceId?: DeviceId,
        public readonly severity?: AlertSeverity,
        public readonly status?: AlertStatus,
        public readonly timeRange?: TimeRange,
        public readonly limit?: number,
        public readonly offset?: number
    ) {}

    static create(
        tenantId: string,
        deviceId?: string,
        severity?: SeverityLevel,
        status?: StatusType,
        startTime?: Date,
        endTime?: Date,
        limit?: number,
        offset?: number
    ): ListAlertsQuery {
        const timeRange = startTime && endTime 
            ? TimeRange.create(startTime, endTime) 
            : undefined;
            
        return new ListAlertsQuery(
            CustomerId.create(tenantId),
            deviceId ? DeviceId.create(deviceId) : undefined,
            severity ? AlertSeverity.create(severity) : undefined,
            status ? AlertStatus.create(status) : undefined,
            timeRange,
            limit,
            offset
        );
    }
}