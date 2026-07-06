import {Query} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';

export class GetSystemMetricsQuery implements Query {
    /** Static type identifier that survives minification */
    static readonly type = 'GetSystemMetricsQuery';

    private constructor(
        public readonly tenantId: CustomerId,
        public readonly timeRange?: TimeRange,
        public readonly metricNames?: string[],
        public readonly limit?: number,
        /** When set, restrict results to metrics reported by these devices (e.g. all devices of a given type). */
        public readonly deviceIds?: string[]
    ) {}

    static create(
        tenantId: string,
        startTime?: Date,
        endTime?: Date,
        metricNames?: string[],
        limit?: number,
        deviceIds?: string[]
    ): GetSystemMetricsQuery {
        const timeRange = startTime && endTime
            ? TimeRange.create(startTime, endTime)
            : undefined;

        return new GetSystemMetricsQuery(
            CustomerId.create(tenantId),
            timeRange,
            metricNames,
            limit,
            deviceIds
        );
    }
}