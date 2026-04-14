import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {ListAlertsQuery} from './list-alerts.query';
import {AlertRepository} from '../../../domain/interfaces/alert-repository.interface';
import {Alert} from '../../../domain/entities/alert.entity';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

export interface AlertsResult {
    alerts: Alert[];
    total: number;
}

export class ListAlertsHandler implements QueryHandler<ListAlertsQuery, AlertsResult> {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async handle(query: ListAlertsQuery): Promise<AlertsResult> {
        // Validate tenant boundary
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'ListAlerts');

        let alerts: Alert[] = [];

        // Get alerts based on the provided filters
        if (query.deviceId && query.status) {
            // Filter by device ID and status
            const deviceAlerts = await this.alertRepository.findByDeviceId(
                query.deviceId,
                query.tenantId,
                query.timeRange
            );
            alerts = deviceAlerts.filter(alert => alert.status.equals(query.status!));
        } else if (query.deviceId && query.severity) {
            // Filter by device ID and severity
            const deviceAlerts = await this.alertRepository.findByDeviceId(
                query.deviceId,
                query.tenantId,
                query.timeRange
            );
            alerts = deviceAlerts.filter(alert => alert.severity.value === query.severity!.value);
        } else if (query.deviceId) {
            // Filter by device ID only
            alerts = await this.alertRepository.findByDeviceId(
                query.deviceId,
                query.tenantId,
                query.timeRange
            );
        } else if (query.status) {
            // Filter by status only
            alerts = await this.alertRepository.findByStatus(
                query.status,
                query.tenantId,
                query.timeRange
            );
        } else if (query.severity) {
            // Filter by severity only
            alerts = await this.alertRepository.findBySeverity(
                query.severity,
                query.tenantId,
                query.timeRange
            );
        } else {
            // No specific filters, get all alerts
            alerts = await this.alertRepository.findAll(
                query.tenantId,
                query.timeRange,
                query.limit,
                query.offset
            );
        }

        // Get total count for pagination
        const total = await this.alertRepository.count(query.tenantId, query.timeRange);

        // Apply pagination if not already applied by the repository
        if (query.limit && query.offset && !query.deviceId && !query.severity && !query.status) {
            // Pagination already applied in the repository call
        } else if (query.limit) {
            const offset = query.offset || 0;
            alerts = alerts.slice(offset, offset + query.limit);
        }

        return {
            alerts,
            total
        };
    }
}