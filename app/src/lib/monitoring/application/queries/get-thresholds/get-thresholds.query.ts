import {Query} from '@/lib/shared/application/interfaces/query.interface';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {ThresholdType} from '../../../domain/entities/threshold.entity';
import {AlertSeverity, SeverityLevel} from '../../../domain/value-objects/alert-severity.vo';

export class GetThresholdsQuery implements Query {
    private constructor(
        public readonly tenantId: CustomerId,
        public readonly deviceId?: DeviceId,
        public readonly type?: ThresholdType,
        public readonly metricName?: string,
        public readonly severity?: AlertSeverity,
        public readonly includeDisabled?: boolean
    ) {}

    static create(
        tenantId: string,
        deviceId?: string,
        type?: ThresholdType,
        metricName?: string,
        severity?: SeverityLevel,
        includeDisabled: boolean = false
    ): GetThresholdsQuery {
        return new GetThresholdsQuery(
            CustomerId.create(tenantId),
            deviceId ? DeviceId.create(deviceId) : undefined,
            type,
            metricName,
            severity ? AlertSeverity.create(severity) : undefined,
            includeDisabled
        );
    }
}