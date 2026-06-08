import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {MetricDataPoint, MetricsRepository} from '@iotpilot/core/device/domain/interfaces/metrics-repository.interface';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

type PrismaClient = ReturnType<PrismaService['getClient']>;

/**
 * Minimal Prisma-backed MetricsRepository using the `device_metrics` table.
 * This supports GetDeviceMetricsQuery without keeping a stub in the ServiceContainer.
 */
export class PrismaDeviceMetricsRepository implements MetricsRepository {
  private readonly prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  private get prisma(): PrismaClient {
    return this.prismaService.getClient();
  }

  async getMetrics(
    deviceId: DeviceId,
    metricType: string,
    from: Date,
    to: Date,
    tenantContext: TenantContext
  ): Promise<MetricDataPoint[]> {
    const where: any = {
      deviceId: deviceId.getValue(),
      metric: metricType,
      deletedAt: null,
      timestamp: { gte: from, lte: to }
    };

    // Tenant enforcement via relation filter (DeviceMetric -> Device)
    if (tenantContext && !tenantContext.isSuperAdminUser()) {
      const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
      if (tenantId) {
        where.device = { customerId: tenantId };
      }
    }

    const rows = await this.prisma.deviceMetric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, value: true }
    });

    return rows.map((r) => ({ timestamp: r.timestamp, value: r.value }));
  }

  async getLatestMetric(
    deviceId: DeviceId,
    metricType: string,
    tenantContext: TenantContext
  ): Promise<MetricDataPoint | null> {
    const where: any = {
      deviceId: deviceId.getValue(),
      metric: metricType,
      deletedAt: null
    };

    if (tenantContext && !tenantContext.isSuperAdminUser()) {
      const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
      if (tenantId) {
        where.device = { customerId: tenantId };
      }
    }

    const row = await this.prisma.deviceMetric.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, value: true }
    });

    return row ? { timestamp: row.timestamp, value: row.value } : null;
  }

  async storeMetric(
    deviceId: DeviceId,
    metricType: string,
    value: number,
    timestamp: Date | null,
    tenantContext: TenantContext
  ): Promise<void> {
    // Best-effort tenant enforcement: only non-superadmin must have a tenant id.
    if (tenantContext && !tenantContext.isSuperAdminUser() && !tenantContext.getCustomerId()) {
      throw new Error('Tenant context is required to store metrics');
    }

    await this.prisma.deviceMetric.create({
      data: {
        deviceId: deviceId.getValue(),
        metric: metricType,
        value,
        unit: null,
        timestamp: timestamp ?? new Date(),
        deletedAt: null
      }
    });
  }

  async saveMany(
    metrics: Array<{ deviceId: string; metric: string; value: number; unit: string; timestamp: Date }>,
    tenantContext?: TenantContext
  ): Promise<void> {
    if (tenantContext && !tenantContext.isSuperAdminUser() && !tenantContext.getCustomerId()) {
      throw new Error('Tenant context is required to store metrics');
    }

    await this.prisma.deviceMetric.createMany({
      data: metrics.map((m) => ({
        deviceId: m.deviceId,
        metric: m.metric,
        value: m.value,
        unit: m.unit ?? null,
        timestamp: m.timestamp,
        deletedAt: null
      }))
    });
  }

  async deleteMetricsForDevice(deviceId: DeviceId, tenantContext: TenantContext): Promise<void> {
    const where: any = { deviceId: deviceId.getValue(), deletedAt: null };
    if (tenantContext && !tenantContext.isSuperAdminUser()) {
      const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
      if (tenantId) {
        where.device = { customerId: tenantId };
      }
    }

    await this.prisma.deviceMetric.updateMany({
      where,
      data: { deletedAt: new Date() }
    });
  }
}


