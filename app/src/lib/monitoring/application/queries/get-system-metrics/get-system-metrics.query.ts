import {Query} from '@/lib/shared/application/interfaces/query.interface';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';

export class GetSystemMetricsQuery implements Query {
    /** Static type identifier that survives minification */
    static readonly type = 'GetSystemMetricsQuery';

    private constructor(
        public readonly tenantId: CustomerId,
        public readonly timeRange?: TimeRange,
        public readonly metricNames?: string[],
        public readonly limit?: number
    ) {}

    static create(
        tenantId: string,
        startTime?: Date,
        endTime?: Date,
        metricNames?: string[],
        limit?: number
    ): GetSystemMetricsQuery {
        const timeRange = startTime && endTime 
            ? TimeRange.create(startTime, endTime) 
            : undefined;
            
        return new GetSystemMetricsQuery(
            CustomerId.create(tenantId),
            timeRange,
            metricNames,
            limit
        );
    }
}