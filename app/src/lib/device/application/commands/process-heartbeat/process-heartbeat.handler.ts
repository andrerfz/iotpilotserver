import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {HeartbeatData, ProcessHeartbeatCommand} from './process-heartbeat.command';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface HeartbeatResult {
    deviceId: string;
    status: string;
    lastSeen: Date;
}

/**
 * Handler for processing device heartbeats
 * Uses constructor injection for PrismaService dependency
 */
export class ProcessHeartbeatHandler implements CommandHandler<ProcessHeartbeatCommand, HeartbeatResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: ProcessHeartbeatCommand): Promise<HeartbeatResult> {
        const { data, userId, tenantContext } = command;

        // Find the device
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

        // Check device ownership (unless user is admin/superadmin)
        const customerId = tenantContext.getCustomerId();
        if (!tenantContext.isSuperAdminUser() && customerId) {
            if (device.customerId !== customerId.getValue()) {
                throw new Error('Device belongs to another customer');
            }
        }

        // Update device with latest data
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

        // Store metrics for historical tracking
        await this.storeMetrics(device.id, data);

        // Check for alert conditions
        await this.checkAlertConditions(device.id, data, device.userId, device.customerId);

        return {
            deviceId: updatedDevice.id,
            status: updatedDevice.status,
            lastSeen: updatedDevice.lastSeen || new Date()
        };
    }

    private async storeMetrics(deviceId: string, data: HeartbeatData): Promise<void> {
        const metricsToStore = [];

        if (data.cpuUsage !== undefined) {
            metricsToStore.push({
                deviceId,
                metric: 'cpu_usage',
                value: data.cpuUsage,
                unit: '%'
            });
        }

        if (data.cpuTemperature !== undefined) {
            metricsToStore.push({
                deviceId,
                metric: 'cpu_temperature',
                value: data.cpuTemperature,
                unit: '°C'
            });
        }

        if (data.memoryUsagePercent !== undefined) {
            metricsToStore.push({
                deviceId,
                metric: 'memory_usage',
                value: data.memoryUsagePercent,
                unit: '%'
            });
        }

        if (data.diskUsagePercent !== undefined) {
            metricsToStore.push({
                deviceId,
                metric: 'disk_usage',
                value: data.diskUsagePercent,
                unit: '%'
            });
        }

        if (metricsToStore.length > 0) {
            await this.prisma.deviceMetric.createMany({
                data: metricsToStore
            });
        }
    }

    private async checkAlertConditions(
        deviceId: string,
        data: HeartbeatData,
        userId: string | null,
        customerId: string
    ): Promise<void> {
        const alerts: Array<{
            deviceId: string;
            userId: string | null;
            customerId: string;
            type: string;
            severity: string;
            title: string;
            message: string;
        }> = [];

        // High CPU usage
        if (data.cpuUsage && data.cpuUsage > 85) {
            alerts.push({
                deviceId,
                userId,
                customerId,
                type: 'HIGH_CPU',
                severity: data.cpuUsage > 95 ? 'CRITICAL' : 'WARNING',
                title: 'High CPU Usage',
                message: `CPU usage is ${data.cpuUsage}%`
            });
        }

        // High memory usage
        if (data.memoryUsagePercent && data.memoryUsagePercent > 85) {
            alerts.push({
                deviceId,
                userId,
                customerId,
                type: 'HIGH_MEMORY',
                severity: data.memoryUsagePercent > 95 ? 'CRITICAL' : 'WARNING',
                title: 'High Memory Usage',
                message: `Memory usage is ${data.memoryUsagePercent}%`
            });
        }

        // High temperature
        if (data.cpuTemperature && data.cpuTemperature > 70) {
            alerts.push({
                deviceId,
                userId,
                customerId,
                type: 'HIGH_TEMPERATURE',
                severity: data.cpuTemperature > 80 ? 'CRITICAL' : 'WARNING',
                title: 'High Temperature',
                message: `CPU temperature is ${data.cpuTemperature}°C`
            });
        }

        // Low disk space
        if (data.diskUsagePercent && data.diskUsagePercent > 85) {
            alerts.push({
                deviceId,
                userId,
                customerId,
                type: 'LOW_DISK_SPACE',
                severity: data.diskUsagePercent > 95 ? 'CRITICAL' : 'WARNING',
                title: 'Low Disk Space',
                message: `Disk usage is ${data.diskUsagePercent}%`
            });
        }

        // Application errors
        if (data.appStatus === 'ERROR') {
            alerts.push({
                deviceId,
                userId,
                customerId,
                type: 'APPLICATION_ERROR',
                severity: 'ERROR',
                title: 'Application Error',
                message: 'Device application is in error state'
            });
        }

        // Create alerts that don't already exist
        for (const alertData of alerts) {
            const existingAlert = await this.prisma.alert.findFirst({
                where: {
                    deviceId: alertData.deviceId,
                    type: alertData.type as any,
                    resolved: false
                }
            });

            if (!existingAlert) {
                await this.prisma.alert.create({
                    data: alertData as any
                });
            }
        }
    }
}
