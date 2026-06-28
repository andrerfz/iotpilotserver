import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {HeartbeatData, ProcessHeartbeatCommand} from './process-heartbeat.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {MetricsCollectedEvent} from '@iotpilot/core/device/domain/events/metrics-collected.event';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {DeviceMetrics} from '@iotpilot/core/device/domain/entities/device-metrics.entity';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

// System-metric alert config. `warn` is the configurable threshold (the "Umbrales"
// modal stores these in the thresholds table as metricName cpu_usage/memory_usage/
// disk_usage/temperature); `critOffset` derives the CRITICAL line above it. `def` is
// the fallback when neither a device-scoped nor a global threshold is configured.
interface SystemMetricConfig {
    metricName: string;
    type: string;
    label: string;
    title: string;
    critTitle: string;
    unit: string;
    def: number;
    critOffset: number;
    cap: number;
    read: (d: HeartbeatData) => number | undefined;
}

const SYSTEM_METRICS: SystemMetricConfig[] = [
    { metricName: 'cpu_usage',    type: 'HIGH_CPU',         label: 'CPU usage',         title: 'High CPU Usage',    critTitle: 'Critical CPU Usage',    unit: '%',  def: 80, critOffset: 15, cap: 100, read: d => d.cpuUsage },
    { metricName: 'memory_usage', type: 'HIGH_MEMORY',      label: 'Memory usage',      title: 'High Memory Usage', critTitle: 'Critical Memory Usage', unit: '%',  def: 85, critOffset: 10, cap: 100, read: d => d.memoryUsagePercent },
    { metricName: 'disk_usage',   type: 'LOW_DISK_SPACE',   label: 'Disk usage',        title: 'Low Disk Space',    critTitle: 'Critically Low Disk',   unit: '%',  def: 90, critOffset: 8,  cap: 100, read: d => d.diskUsagePercent },
    { metricName: 'temperature',  type: 'HIGH_TEMPERATURE', label: 'CPU temperature',   title: 'High Temperature',  critTitle: 'Critical Temperature',  unit: '°C', def: 70, critOffset: 10, cap: 999, read: d => d.cpuTemperature },
];

export interface FirmwareDirective {
    targetVersion: string;
}

export interface HeartbeatResult {
    deviceId: string;
    status: string;
    lastSeen: Date;
    firmware?: FirmwareDirective;
}

export class ProcessHeartbeatHandler implements CommandHandler<ProcessHeartbeatCommand, HeartbeatResult> {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly eventBus: EventBus
    ) {}

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: ProcessHeartbeatCommand): Promise<HeartbeatResult> {
        const { data, userId } = command;
        const tenantContext = command.getTenantContext();

        const device = await this.prisma.device.findUnique({
            where: { deviceId: data.deviceId },
            include: {
                user: {
                    select: { id: true, username: true }
                }
            }
        });

        if (!device) {
            throw new Error('Device not found. Please register the device first.');
        }

        const customerId = tenantContext.getCustomerId();
        if (!tenantContext.isSuperAdminUser() && customerId) {
            if (device.customerId !== customerId.getValue()) {
                throw new Error('Device belongs to another customer');
            }
        }

        const updatedDevice = await this.prisma.device.update({
            where: { deviceId: data.deviceId },
            data: {
                status: 'ONLINE',
                lastSeen: new Date(),
                uptime: data.uptime,
                loadAverage: data.loadAverage,
                cpuUsage: data.cpuUsage,
                cpuTemp: data.cpuTemperature,
                memoryUsage: data.memoryUsagePercent,
                memoryTotal: data.memoryTotalMb,
                diskUsage: data.diskUsagePercent,
                diskTotal: data.diskTotal,
                appStatus: data.appStatus || 'UNKNOWN',
                agentVersion: data.agentVersion,
                firmwareVersion: (data as any).firmwareVersion ?? undefined,
                lastBoot: data.lastBoot ? new Date(data.lastBoot) : null,
                ipAddress: data.ipAddress,
                tailscaleIp: data.tailscaleIp,
                updatedAt: new Date()
            },
            select: {
                id: true,
                status: true,
                lastSeen: true,
                targetFirmwareVersion: true,
            }
        });

        await this.storeMetrics(device.id, data);
        await this.checkAlertConditions(device.id, data, device.userId, device.customerId);

        if (device.customerId) {
            try {
                const tenantId = CustomerId.create(device.customerId);
                const metrics = DeviceMetrics.create({
                    deviceId: DeviceId.create(device.id),
                    cpuUsage: data.cpuUsage ?? 0,
                    memoryUsage: data.memoryUsagePercent ?? 0,
                    diskUsage: data.diskUsagePercent ?? 0,
                    networkRx: 0,
                    networkTx: 0,
                    uptime: Number(data.uptime ?? 0),
                    loadAverage: data.loadAverage ? data.loadAverage.split(/[\s,]+/).map(Number).filter((n: number) => !Number.isNaN(n)) : [],
                    temperature: data.cpuTemperature,
                    collectedAt: new Date(),
                    customerId: tenantId,
                });
                await this.eventBus.publish(new MetricsCollectedEvent(
                    DeviceId.create(device.id),
                    DeviceName.create(device.name ?? 'unknown'),
                    metrics,
                    new Date(),
                    false,
                    tenantId,
                ));
            } catch (err) {
                console.warn(`[ProcessHeartbeatHandler] Failed to publish MetricsCollectedEvent: ${(err as Error).message}`);
            }
        }

        const result: HeartbeatResult = {
            deviceId: updatedDevice.id,
            status: updatedDevice.status,
            lastSeen: updatedDevice.lastSeen || new Date(),
        };

        if (updatedDevice.targetFirmwareVersion) {
            result.firmware = { targetVersion: updatedDevice.targetFirmwareVersion };
        }

        return result;
    }

    private async storeMetrics(deviceId: string, data: HeartbeatData): Promise<void> {
        const metricsToStore = [];

        if (data.cpuUsage !== undefined) {
            metricsToStore.push({ deviceId, metric: 'cpu_usage', value: data.cpuUsage, unit: '%' });
        }
        if (data.cpuTemperature !== undefined) {
            metricsToStore.push({ deviceId, metric: 'cpu_temperature', value: data.cpuTemperature, unit: '°C' });
        }
        if (data.memoryUsagePercent !== undefined) {
            metricsToStore.push({ deviceId, metric: 'memory_usage', value: data.memoryUsagePercent, unit: '%' });
        }
        if (data.diskUsagePercent !== undefined) {
            metricsToStore.push({ deviceId, metric: 'disk_usage', value: data.diskUsagePercent, unit: '%' });
        }

        if (metricsToStore.length > 0) {
            await this.prisma.deviceMetric.createMany({ data: metricsToStore });
        }
    }

    /**
     * Effective warning threshold per system metric: a device-scoped threshold
     * (deviceId = this device) overrides the tenant-wide global (deviceId = null);
     * when neither exists we fall back to the metric's built-in default. The query
     * is scoped to the device's own customerId (cross-tenant isolation). Mirrors the
     * sensor path's loadThresholds so the "Umbrales" modal drives system alerts too.
     */
    private async loadSystemThresholds(deviceId: string, customerId: string): Promise<Record<string, number>> {
        const metricNames = SYSTEM_METRICS.map(m => m.metricName);
        const rows = await this.prisma.threshold.findMany({
            where: {
                customerId,
                metricName: { in: metricNames },
                enabled: true,
                deletedAt: null,
                OR: [{ deviceId }, { deviceId: null }],
            },
            orderBy: { updatedAt: 'desc' },
        });
        const pick = (metric: string, def: number): number => {
            const deviceRow = rows.find(r => r.metricName === metric && r.deviceId === deviceId);
            if (deviceRow) return deviceRow.value;
            return rows.find(r => r.metricName === metric && r.deviceId === null)?.value ?? def;
        };
        const warn: Record<string, number> = {};
        for (const m of SYSTEM_METRICS) warn[m.metricName] = pick(m.metricName, m.def);
        return warn;
    }

    private async checkAlertConditions(
        deviceId: string,
        data: HeartbeatData,
        userId: string | null,
        customerId: string | null
    ): Promise<void> {
        if (!customerId) return;

        const warn = await this.loadSystemThresholds(deviceId, customerId);

        for (const m of SYSTEM_METRICS) {
            const value = m.read(data);
            if (value === undefined || value === null) continue; // metric not reported by this device

            const warnLine = warn[m.metricName];
            const critLine = Math.min(warnLine + m.critOffset, m.cap);
            const open = await this.prisma.alert.findFirst({
                where: { deviceId, type: m.type as any, resolved: false },
            });

            if (value > warnLine) {
                const severity = value >= critLine ? 'CRITICAL' : 'WARNING';
                const title = severity === 'CRITICAL' ? m.critTitle : m.title;
                const message = `${m.label} is ${value}${m.unit} (threshold ${warnLine}${m.unit})`;
                if (!open) {
                    await this.prisma.alert.create({
                        data: { deviceId, userId: userId ?? undefined, customerId, type: m.type as any, severity, title, message } as any,
                    });
                } else if (open.severity === 'WARNING' && severity === 'CRITICAL') {
                    await this.prisma.alert.update({
                        where: { id: open.id },
                        data: { severity: 'CRITICAL', title: m.critTitle, message },
                    });
                }
            } else if (open) {
                // Metric recovered below the warning line — resolve the open alert.
                await this.prisma.alert.update({
                    where: { id: open.id },
                    data: { resolved: true, resolvedAt: new Date() },
                });
            }
        }

        // Application error is a state flag, not a threshold breach.
        if (data.appStatus === 'ERROR') {
            const open = await this.prisma.alert.findFirst({
                where: { deviceId, type: 'APPLICATION_ERROR' as any, resolved: false },
            });
            if (!open) {
                await this.prisma.alert.create({
                    data: {
                        deviceId, userId: userId ?? undefined, customerId,
                        type: 'APPLICATION_ERROR' as any, severity: 'ERROR',
                        title: 'Application Error', message: 'Device application is in error state',
                    } as any,
                });
            }
        } else {
            await this.prisma.alert.updateMany({
                where: { deviceId, type: 'APPLICATION_ERROR' as any, resolved: false },
                data: { resolved: true, resolvedAt: new Date() },
            });
        }
    }
}
