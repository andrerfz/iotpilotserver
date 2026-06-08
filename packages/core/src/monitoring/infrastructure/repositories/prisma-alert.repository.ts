import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {AlertRepository} from '../../domain/interfaces/alert-repository.interface';
import {Alert, AlertEntity} from '../../domain/entities/alert.entity';
import {AlertId} from '../../domain/value-objects/alert-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../../domain/value-objects/threshold-id.vo';
import {AlertSeverity, SeverityLevel} from '../../domain/value-objects/alert-severity.vo';
import {AlertStatus, StatusType} from '../../domain/value-objects/alert-status.vo';
import {AlertType} from '../../domain/value-objects/alert-type.vo';
import {TimeRange} from '../../domain/value-objects/time-range.vo';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export class PrismaAlertRepository implements AlertRepository {
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
     * Maps domain AlertSeverity (LOW,MEDIUM,HIGH,CRITICAL) to Prisma AlertSeverity enum (INFO,WARNING,ERROR,CRITICAL)
     * @param severity Domain AlertSeverity value object
     * @returns Prisma AlertSeverity enum value
     */
    private mapToPrismaSeverity(severity: AlertSeverity): string {
        switch (severity.value) {
            case 'LOW': return 'INFO';
            case 'MEDIUM': return 'WARNING';
            case 'HIGH': return 'WARNING';
            case 'CRITICAL': return 'CRITICAL';
            default: return 'INFO';
        }
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

    async save(alert: Alert): Promise<Alert> {
        // Validate tenant boundary
        const tenantId = alert.getCustomerId();
        if (!tenantId) {
            throw new Error('Alert must have a customerId');
        }
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'SaveAlert');

        const alertId = alert.getId().getValue();
        const deviceId = alert.deviceId?.getValue();
        const userId = alert.acknowledgedBy?.getValue() || null;

        const prismaSeverity = this.mapToPrismaSeverity(alert.severity) as any;
        const alertType = (alert.metadata?.rawType || alert.type?.getValue() || 'CUSTOM') as any;

        const thresholdId = alert.thresholdId?.getValue?.() || null;

        await this.prisma.alert.upsert({
            where: { id: alertId },
            update: {
                type: alertType,
                severity: prismaSeverity,
                title: alert.title,
                message: alert.message,
                source: alert.metadata?.source || null,
                thresholdId: thresholdId,
                resolved: alert.status.getValue() === 'RESOLVED',
                resolvedAt: alert.resolvedAt || null,
                acknowledgedAt: alert.acknowledgedAt || null,
                updatedAt: new Date(),
                ...(deviceId && { deviceId }),
                ...(userId && { userId })
            },
            create: {
                id: alertId,
                type: alertType,
                severity: prismaSeverity,
                title: alert.title,
                message: alert.message,
                source: alert.metadata?.source || null,
                thresholdId: thresholdId,
                resolved: alert.status.getValue() === 'RESOLVED',
                resolvedAt: alert.resolvedAt || null,
                acknowledgedAt: alert.acknowledgedAt || null,
                createdAt: alert.createdAt,
                updatedAt: new Date(),
                deviceId: deviceId || null,
                userId: userId,
                customerId: tenantId.getValue()
            }
        });

        return alert;
    }

    async findById(id: AlertId, tenantId: CustomerId): Promise<Alert | null> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAlertById');

        const alertData = await this.prisma.alert.findFirst({
            where: {
                id: id.getValue(),
                customerId: tenantId.getValue()
            }
        });

        if (!alertData) {
            return null;
        }

        return this.mapToEntity(alertData);
    }

    async findByDeviceId(deviceId: DeviceId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAlertsByDeviceId');

        const where: Record<string, unknown> = {
            deviceId: deviceId.getValue(),
            customerId: tenantId.getValue()
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        const alertsData = await this.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return alertsData.map((alertData: any) => this.mapToEntity(alertData));
    }

    async findByThresholdId(thresholdId: ThresholdId, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAlertsByThresholdId');

        const where: Record<string, unknown> = {
            thresholdId: thresholdId.getValue(),
            customerId: tenantId.getValue(),
            deletedAt: null,
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        const alertsData = await this.prisma.alert.findMany({
            where: where as any,
            orderBy: { createdAt: 'desc' }
        });

        return alertsData.map((alertData: any) => this.mapToEntity(alertData));
    }

    async findBySeverity(severity: AlertSeverity, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAlertsBySeverity');

        const where: Record<string, unknown> = {
            severity: this.mapToPrismaSeverity(severity),
            customerId: tenantId.value
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        const alertsData = await this.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return alertsData.map((alertData: any) => this.mapToEntity(alertData));
    }

    async findByStatus(status: AlertStatus, tenantId: CustomerId, timeRange?: TimeRange): Promise<Alert[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAlertsByStatus');

        // Prisma schema uses resolved:Boolean (not a status string).
        // Map domain AlertStatus to the DB representation:
        //   RESOLVED    → resolved = true
        //   ACKNOWLEDGED → resolved = false AND userId IS NOT NULL
        //   ACTIVE       → resolved = false AND userId IS NULL
        const resolvedFilter = status.value === 'RESOLVED'
            ? { resolved: true }
            : status.value === 'ACKNOWLEDGED'
                ? { resolved: false, userId: { not: null } }
                : { resolved: false, userId: null };

        const where: Record<string, unknown> = {
            ...resolvedFilter,
            customerId: tenantId.value,
            deletedAt: null,
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        const alertsData = await this.prisma.alert.findMany({
            where: where as any,
            orderBy: { createdAt: 'desc' }
        });

        return alertsData.map((alertData: any) => this.mapToEntity(alertData));
    }

    async findAll(tenantId: CustomerId, timeRange?: TimeRange, limit?: number, offset?: number): Promise<Alert[]> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'FindAllAlerts');

        const where: Record<string, unknown> = {
            customerId: tenantId.value
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        const alertsData = await this.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        return alertsData.map((alertData: any) => this.mapToEntity(alertData));
    }

    async count(tenantId: CustomerId, timeRange?: TimeRange): Promise<number> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'CountAlerts');

        const where: Record<string, unknown> = {
            customerId: tenantId.value
        };

        if (timeRange) {
            where.createdAt = this.buildTimeRangeFilter(timeRange);
        }

        return await this.prisma.alert.count({ where });
    }

    async delete(id: AlertId, tenantId: CustomerId): Promise<void> {
        // Validate tenant boundary
        const tenantContext = this.createMockTenantContext(tenantId);
        this.tenantValidator.validateTenantAccess(tenantContext, tenantId, 'DeleteAlert');

        await this.prisma.alert.deleteMany({
            where: {
                id: id.value,
                customerId: tenantId.value
            }
        });
    }

    /**
     * Maps Prisma AlertSeverity enum to domain AlertSeverity value
     * @param severity Prisma AlertSeverity enum value
     * @returns Domain AlertSeverity value of type SeverityLevel
     */
    private mapToDomainSeverity(severity: string): SeverityLevel {
        switch (severity) {
            case 'INFO':
                return 'info' as SeverityLevel;
            case 'WARNING':
                return 'warning' as SeverityLevel;
            case 'CRITICAL':
                return 'critical' as SeverityLevel;
            case 'ERROR':
                return 'emergency' as SeverityLevel;
            default:
                return 'info' as SeverityLevel;
        }
    }

    /** Maps Prisma AlertSeverity (INFO,WARNING,ERROR,CRITICAL) to domain (LOW,MEDIUM,HIGH,CRITICAL) for AlertSeverity.fromString. */
    private mapFromPrismaSeverity(severity: string): string {
        switch (String(severity || '').toUpperCase()) {
            case 'INFO': return 'LOW';
            case 'WARNING': return 'MEDIUM';
            case 'ERROR': return 'HIGH';
            case 'CRITICAL': return 'CRITICAL';
            case 'LOW': case 'MEDIUM': case 'HIGH': return String(severity).toUpperCase();
            default: return 'LOW';
        }
    }

    /**
     * Maps database status to domain StatusType
     * @param status Database status string
     * @returns Domain StatusType value
     */
    private mapToDomainStatus(status: string): StatusType {
        switch (status.toUpperCase()) {
            case 'ACTIVE':
                return 'ACTIVE';
            case 'ACKNOWLEDGED':
                return 'ACKNOWLEDGED';
            case 'RESOLVED':
                return 'RESOLVED';
            default:
                return 'ACTIVE'; // Default to ACTIVE for unknown statuses
        }
    }

    private mapToEntity(data: any): Alert {
        const customerId = CustomerId.create(data.customerId as string);
        const status = data.resolved
            ? AlertStatus.RESOLVED
            : (data.userId ? AlertStatus.ACKNOWLEDGED : AlertStatus.ACTIVE);

        const entity = AlertEntity.create(
            AlertId.fromString(data.id),
            data.title,
            data.message,
            AlertSeverity.fromString(this.mapFromPrismaSeverity(data.severity)),
            status,
            data.deviceId ? DeviceId.create(data.deviceId) : undefined,
            customerId,
            undefined, // metricName
            undefined, // metricValue
            undefined, // thresholdValue
            data.thresholdId ? ThresholdId.fromString(data.thresholdId) : undefined,
            data.createdAt,
            data.acknowledgedAt ?? undefined,
            data.userId ? UserId.create(data.userId) : undefined, // acknowledgedBy
            data.resolvedAt,
            data.userId ? UserId.create(data.userId) : undefined, // resolvedBy
            data.source ? data.source : undefined, // notes
            data.type ? (() => { try { return AlertType.fromString(data.type); } catch { return undefined; } })() : undefined,
            undefined // metadata
        );
        entity.publicId = data.publicId;
        return entity;
    }

    private buildTimeRangeFilter(timeRange: TimeRange): Record<string, unknown> {
        const filter: Record<string, unknown> = {};

        filter.gte = timeRange.getStartTime();
        filter.lte = timeRange.getEndTime();

        return filter;
    }

    async create(alert: any): Promise<void> {
        await this.save(alert);
    }

    async findActiveByDeviceAndType(deviceId: string, alertType: string, tenantContext?: TenantContext): Promise<any[]> {
        const tenantId = tenantContext?.getCustomerId();
        if (!tenantId) {
            throw new Error('Tenant context is required for finding active alerts');
        }

        // Validate tenant access
        this.tenantValidator.validateTenantAccess(tenantContext!, tenantId, 'FindActiveAlerts');

        const alerts = await this.prisma.alert.findMany({
            where: {
                deviceId: deviceId,
                type: alertType as any,
                resolved: false,
                customerId: tenantId.getValue()
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return alerts.map((alert: any) => this.mapToEntity(alert));
    }
}