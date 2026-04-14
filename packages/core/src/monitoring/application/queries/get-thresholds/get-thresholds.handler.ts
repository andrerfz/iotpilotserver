import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {GetThresholdsQuery} from './get-thresholds.query';
import {ThresholdRepository} from '../../../domain/interfaces/threshold-repository.interface';
import {Threshold} from '../../../domain/entities/threshold.entity';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

export class GetThresholdsHandler implements QueryHandler<GetThresholdsQuery, Threshold[]> {
    constructor(
        private readonly thresholdRepository: ThresholdRepository,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {}

    async handle(query: GetThresholdsQuery): Promise<Threshold[]> {
        // Validate tenant boundary
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'GetThresholds');

        let thresholds: Threshold[] = [];

        // Get thresholds based on the provided filters
        if (query.deviceId) {
            if (query.deviceId.value === 'global') {
                // Special case for global thresholds
                thresholds = await this.thresholdRepository.findGlobalThresholds(query.tenantId);
            } else if (query.deviceId.value === 'applicable') {
                // Special case for applicable thresholds (device-specific + global)
                // This requires the actual device ID to be provided elsewhere
                thresholds = await this.thresholdRepository.findAll(query.tenantId, query.includeDisabled);
            } else {
                // Get applicable thresholds for a specific device (device-specific + global)
                thresholds = await this.thresholdRepository.findApplicableThresholds(
                    query.deviceId,
                    query.tenantId,
                    query.includeDisabled
                );
            }
        } else if (query.type) {
            // Filter by type
            thresholds = await this.thresholdRepository.findByType(
                query.type,
                query.tenantId
            );
        } else if (query.metricName) {
            // Filter by metric name
            thresholds = await this.thresholdRepository.findByMetricName(
                query.metricName,
                query.tenantId
            );
        } else if (query.severity) {
            // Filter by severity
            thresholds = await this.thresholdRepository.findBySeverity(
                query.severity,
                query.tenantId
            );
        } else {
            // No specific filters, get all thresholds
            thresholds = await this.thresholdRepository.findAll(
                query.tenantId,
                query.includeDisabled
            );
        }

        // Apply additional filters if needed
        if (query.type && query.deviceId) {
            thresholds = thresholds.filter(threshold => threshold.type === query.type);
        }

        if (query.metricName && query.deviceId) {
            thresholds = thresholds.filter(threshold => threshold.metricName === query.metricName);
        }

        if (query.severity && query.deviceId) {
            thresholds = thresholds.filter(threshold => 
                threshold.severity.value === query.severity!.value
            );
        }

        // Filter out disabled thresholds if not explicitly included
        if (!query.includeDisabled) {
            thresholds = thresholds.filter(threshold => threshold.enabled);
        }

        return thresholds;
    }
}