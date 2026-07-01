import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {ThresholdRepository} from '../../domain/interfaces/threshold-repository.interface';
import {Threshold, ThresholdType} from '../../domain/entities/threshold.entity';
import {ThresholdId} from '../../domain/value-objects/threshold-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {AlertSeverity} from '../../domain/value-objects/alert-severity.vo';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

function normalizeSeverity(s: string): string {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': case 'EMERGENCY': return 'CRITICAL';
    case 'HIGH':     case 'WARNING':   return 'HIGH';
    case 'MEDIUM':   case 'ERROR':     return 'MEDIUM';
    default:                           return 'LOW';
  }
}

export class PrismaThresholdRepository implements ThresholdRepository {
    private readonly prismaService: PrismaService;

    constructor(
        prismaService: PrismaService,
        private readonly tenantValidator: TenantBoundaryValidator
    ) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    /**
     * Creates a mock tenant context for validation purposes
     * @param tenantId The tenant ID
     * @returns A TenantContext object
     */
    private createMockTenantContext(tenantId: CustomerId): TenantContext {
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        return TenantContextImpl.create(tenantId, mockUserId, mockUserRole);
    }

    async save(threshold: Threshold): Promise<Threshold> {
        // Validate tenant boundary
        const tenantId = threshold.getTenantId();
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'SaveThreshold');

        const thresholdData = {
            id: threshold.id.value,
            deviceId: threshold.deviceId?.value || null,
            name: threshold.name,
            description: threshold.description,
            metricName: threshold.metricName,
            operator: threshold.operator,
            value: threshold.value,
            unit: threshold.unit,
            severity: threshold.severity.value,
            enabled: threshold.enabled,
            type: threshold.type,
            cooldownMinutes: threshold.cooldownMinutes,
            createdAt: threshold.createdAt,
            updatedAt: threshold.updatedAt,
            metadata: threshold.metadata,
            customerId: tenantId.value
        };

        await this.prisma.threshold.upsert({
            where: { id: threshold.id.value },
            update: thresholdData,
            create: thresholdData
        });

        return threshold;
    }

    async findById(id: ThresholdId, tenantId: CustomerId): Promise<Threshold | null> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdById');

        const thresholdData = await this.prisma.threshold.findFirst({
            where: {
                id: id.value,
                customerId: tenantId.value
            }
        });

        if (!thresholdData) {
            return null;
        }

        return this.mapToEntity(thresholdData);
    }

    async findByDeviceId(deviceId: DeviceId, tenantId: CustomerId): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdsByDeviceId');

        const thresholdsData = await this.prisma.threshold.findMany({
            where: {
                deviceId: deviceId.value,
                customerId: tenantId.value
            },
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findGlobalThresholds(tenantId: CustomerId): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindGlobalThresholds');

        const thresholdsData = await this.prisma.threshold.findMany({
            where: {
                deviceId: null,
                customerId: tenantId.value
            },
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findByType(type: ThresholdType, tenantId: CustomerId): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdsByType');

        const thresholdsData = await this.prisma.threshold.findMany({
            where: {
                type: type,
                customerId: tenantId.value
            },
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findByMetricName(metricName: string, tenantId: CustomerId): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdsByMetricName');

        const thresholdsData = await this.prisma.threshold.findMany({
            where: {
                metricName: metricName,
                customerId: tenantId.value
            },
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findBySeverity(severity: AlertSeverity, tenantId: CustomerId): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdsBySeverity');

        const thresholdsData = await this.prisma.threshold.findMany({
            where: {
                severity: severity.value,
                customerId: tenantId.value
            },
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findAll(tenantId: CustomerId, includeDisabled: boolean = false): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAllThresholds');

        const where: any = {
            customerId: tenantId.value
        };

        if (!includeDisabled) {
            where.enabled = true;
        }

        const thresholdsData = await this.prisma.threshold.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findApplicableThresholds(deviceId: DeviceId, tenantId: CustomerId, includeDisabled: boolean = false): Promise<Threshold[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindApplicableThresholds');

        const where: any = {
            customerId: tenantId.value,
            OR: [
                { deviceId: deviceId.value },
                { deviceId: null } // Global thresholds
            ]
        };

        if (!includeDisabled) {
            where.enabled = true;
        }

        const thresholdsData = await this.prisma.threshold.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return thresholdsData.map((thresholdData: any) => this.mapToEntity(thresholdData));
    }

    async findByName(name: string, tenantId: CustomerId): Promise<Threshold | null> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindThresholdByName');

        const thresholdData = await this.prisma.threshold.findFirst({
            where: {
                name: name,
                customerId: tenantId.value
            }
        });

        return thresholdData ? this.mapToEntity(thresholdData) : null;
    }

    async delete(id: ThresholdId, tenantId: CustomerId): Promise<void> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'DeleteThreshold');

        await this.prisma.threshold.deleteMany({
            where: {
                id: id.value,
                customerId: tenantId.value
            }
        });
    }

    private mapToEntity(data: any): Threshold {
        return new Threshold(
            ThresholdId.create(data.id),
            data.deviceId ? DeviceId.create(data.deviceId) : null,
            data.name,
            data.description,
            data.metricName,
            data.operator,
            data.value,
            data.unit,
            AlertSeverity.create(normalizeSeverity(data.severity)),
            data.enabled,
            data.type as ThresholdType,
            data.cooldownMinutes,
            new Date(data.createdAt),
            new Date(data.updatedAt),
            data.metadata || {},
            CustomerId.create(data.customerId ?? data.tenantId)
        );
    }
}