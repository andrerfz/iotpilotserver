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

export interface HeartbeatResult {
    deviceId: string;
    status: string;
    lastSeen: Date;
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
                lastBoot: data.lastBoot ? new Date(data.lastBoot) : null,
                ipAddress: data.ipAddress,
                tailscaleIp: data.tailscaleIp,
                updatedAt: new Date()
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

        return {
            deviceId: updatedDevice.id,
            status: updatedDevice.status,
            lastSeen: updatedDevice.lastSeen || new Date()
        };
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

    private async checkAlertConditions(
        deviceId: string,
        data: HeartbeatData,
        userId: string | null,
        customerId: string | null
    ): Promise<void> {
        if (!customerId) return;
        const alerts: Array<{
            deviceId: string;
            userId: string | null;
            customerId: string;
            type: string;
            severity: string;
            title: string;
            message: string;
        }> = [];

        if (data.cpuUsage && data.cpuUsage > 85) {
            alerts.push({
                deviceId, userId, customerId,
                type: 'HIGH_CPU',
                severity: data.cpuUsage > 95 ? 'CRITICAL' : 'WARNING',
                title: 'High CPU Usage',
                message: `CPU usage is ${data.cpuUsage}%`
            });
        }

        if (data.memoryUsagePercent && data.memoryUsagePercent > 85) {
            alerts.push({
                deviceId, userId, customerId,
                type: 'HIGH_MEMORY',
                severity: data.memoryUsagePercent > 95 ? 'CRITICAL' : 'WARNING',
                title: 'High Memory Usage',
                message: `Memory usage is ${data.memoryUsagePercent}%`
            });
        }

        if (data.cpuTemperature && data.cpuTemperature > 70) {
            alerts.push({
                deviceId, userId, customerId,
                type: 'HIGH_TEMPERATURE',
                severity: data.cpuTemperature > 80 ? 'CRITICAL' : 'WARNING',
                title: 'High Temperature',
                message: `CPU temperature is ${data.cpuTemperature}°C`
            });
        }

        if (data.diskUsagePercent && data.diskUsagePercent > 85) {
            alerts.push({
                deviceId, userId, customerId,
                type: 'LOW_DISK_SPACE',
                severity: data.diskUsagePercent > 95 ? 'CRITICAL' : 'WARNING',
                title: 'Low Disk Space',
                message: `Disk usage is ${data.diskUsagePercent}%`
            });
        }

        if (data.appStatus === 'ERROR') {
            alerts.push({
                deviceId, userId, customerId,
                type: 'APPLICATION_ERROR',
                severity: 'ERROR',
                title: 'Application Error',
                message: 'Device application is in error state'
            });
        }

        for (const alertData of alerts) {
            const existingAlert = await this.prisma.alert.findFirst({
                where: { deviceId: alertData.deviceId, type: alertData.type as any, resolved: false }
            });
            if (!existingAlert) {
                await this.prisma.alert.create({ data: alertData as any });
            }
        }
    }
}
