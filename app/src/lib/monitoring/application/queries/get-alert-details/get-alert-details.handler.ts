import {QueryHandler} from '@/lib/shared/application/interfaces/query-handler.interface';
import {GetAlertDetailsQuery} from './get-alert-details.query';
import {AlertRepository} from '../../../domain/interfaces/alert-repository.interface';
import {Alert} from '../../../domain/entities/alert.entity';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import {MetricsRepository} from '../../../domain/interfaces/metrics-repository.interface';
import {ThresholdRepository} from '../../../domain/interfaces/threshold-repository.interface';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';

export interface AlertDetails {
    alert: Alert;
    relatedMetrics?: any[];
    threshold?: any;
}

export class GetAlertDetailsHandler implements QueryHandler<GetAlertDetailsQuery, AlertDetails | null> {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly metricsRepository: MetricsRepository,
        private readonly thresholdRepository: ThresholdRepository,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async execute(query: GetAlertDetailsQuery): Promise<AlertDetails | null> {
        // Validate tenant boundary
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'GetAlertDetails');

        // Get the alert
        const alert = await this.alertRepository.findById(query.alertId, query.tenantId);

        if (!alert) {
            return null;
        }

        // Get related threshold
        const threshold = alert.thresholdId 
            ? await this.thresholdRepository.findById(alert.thresholdId, query.tenantId)
            : null;

        // Get related metrics (if available)
        let relatedMetrics: any[] = [];
        if (alert.deviceId && threshold) {
            // Get metrics around the time the alert was triggered
            const startTime = new Date(alert.createdAt.getTime() - 5 * 60 * 1000); // 5 minutes before
            const endTime = new Date(alert.createdAt.getTime() + 5 * 60 * 1000);   // 5 minutes after
            
            // Create a proper TimeRange object
            const timeRange = new TimeRange(startTime, endTime);

            relatedMetrics = await this.metricsRepository.findByDeviceIdAndName(
                alert.deviceId,
                threshold.metricName,
                query.tenantId,
                timeRange
            );
        }

        return {
            alert,
            relatedMetrics: relatedMetrics.length > 0 ? relatedMetrics : undefined,
            threshold: threshold || undefined
        };
    }
}