import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {GetSystemMetricsQuery} from './get-system-metrics.query';
import {MetricsRepository} from '../../../domain/interfaces/metrics-repository.interface';
import {Metric} from '../../../domain/entities/metric.entity';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

export interface SystemMetricsResult {
  metrics: Metric[];
  summary: Record<string, { count: number; min: number; max: number; avg: number }>;
  availableMetrics: string[];
  lastUpdated: string;
}

export class GetSystemMetricsHandler implements QueryHandler<GetSystemMetricsQuery, SystemMetricsResult> {
    constructor(
        private readonly metricsRepository: MetricsRepository,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async handle(query: GetSystemMetricsQuery): Promise<SystemMetricsResult> {
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'GetSystemMetrics');

        let metrics = await this.metricsRepository.findAll(
            query.tenantId,
            query.timeRange,
            query.limit
        );

        if (query.metricNames && query.metricNames.length > 0) {
            metrics = metrics.filter(m => query.metricNames!.includes(m.name));
        }

        if (query.deviceIds && query.deviceIds.length > 0) {
            const deviceIdSet = new Set(query.deviceIds);
            metrics = metrics.filter(m => deviceIdSet.has(m.deviceId.value));
        }

        const availableMetrics = [...new Set(metrics.map(m => m.name))];

        const summary: SystemMetricsResult['summary'] = {};
        for (const name of availableMetrics) {
            const values = metrics.filter(m => m.name === name).map(m => m.value.value);
            if (!values.length) continue;
            summary[name] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
            };
        }

        return {
            metrics,
            summary,
            availableMetrics,
            lastUpdated: new Date().toISOString(),
        };
    }
}
