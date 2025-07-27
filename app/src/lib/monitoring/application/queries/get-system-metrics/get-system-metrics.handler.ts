import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {GetSystemMetricsQuery} from './get-system-metrics.query';
import {MetricsRepository} from '../../../domain/interfaces/metrics-repository.interface';
import {Metric} from '../../../domain/entities/metric.entity';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';

export class GetSystemMetricsHandler implements QueryHandler<GetSystemMetricsQuery, Metric[]> {
    constructor(
        private readonly metricsRepository: MetricsRepository,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async handle(query: GetSystemMetricsQuery): Promise<Metric[]> {
        // Validate tenant boundary
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'GetSystemMetrics');

        // Get all metrics for the tenant
        let metrics = await this.metricsRepository.findAll(
            query.tenantId,
            query.timeRange,
            query.limit
        );

        // Filter by metric names if provided
        if (query.metricNames && query.metricNames.length > 0) {
            metrics = metrics.filter(metric => 
                query.metricNames!.includes(metric.name)
            );
        }

        return metrics;
    }
}