import {Query} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';

export type ReportType = 'system' | 'device' | 'alerts' | 'performance' | 'custom';
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'html';

export class GenerateReportQuery implements Query {
    private constructor(
        public readonly tenantId: CustomerId,
        public readonly reportType: ReportType,
        public readonly timeRange: TimeRange,
        public readonly deviceId?: DeviceId,
        public readonly metricNames?: string[],
        public readonly includeAlerts?: boolean,
        public readonly includeThresholds?: boolean,
        public readonly format?: ReportFormat,
        public readonly customOptions?: Record<string, any>
    ) {}

    static create(
        tenantId: string,
        reportType: ReportType,
        startTime: Date,
        endTime: Date,
        deviceId?: string,
        metricNames?: string[],
        includeAlerts: boolean = true,
        includeThresholds: boolean = true,
        format: ReportFormat = 'json',
        customOptions?: Record<string, any>
    ): GenerateReportQuery {
        return new GenerateReportQuery(
            CustomerId.create(tenantId),
            reportType,
            TimeRange.create(startTime, endTime),
            deviceId ? DeviceId.create(deviceId) : undefined,
            metricNames,
            includeAlerts,
            includeThresholds,
            format,
            customOptions
        );
    }
}