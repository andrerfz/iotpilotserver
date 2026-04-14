import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {RecordSensorReadingCommand} from './record-sensor-reading.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface SensorReadingResult {
    deviceId: string;
    readingsStored: number;
    alertCreated: boolean;
    alertResolved: boolean;
}

const TEMP_WARNING  = -15.0;
const BATTERY_WARNING  = 20;
const BATTERY_CRITICAL = 10;
const TEMP_CRITICAL = -10.0;

export class RecordSensorReadingHandler implements CommandHandler<RecordSensorReadingCommand, SensorReadingResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(command: RecordSensorReadingCommand): Promise<SensorReadingResult> {
        const { data } = command;
        const tenantContext = command.getTenantContext();

        // Find device by deviceId
        const device = await this.prisma.device.findFirst({
            where: { deviceId: data.deviceId }
        });

        if (!device) {
            throw new Error(`Device not found: ${data.deviceId}`);
        }

        // Tenant check
        const customerId = tenantContext.getCustomerId();
        if (!tenantContext.isSuperAdminUser() && customerId) {
            if (device.customerId !== customerId.getValue()) {
                throw new Error('Device belongs to another customer');
            }
        }

        // Store each reading as individual DeviceMetric row.
        // offsetSeconds > 0 means the reading was buffered offline — backdate its timestamp.
        const now = new Date();
        const metricsToStore = (data.readings ?? []).map(reading => {
            const timestamp = reading.offsetSeconds && reading.offsetSeconds > 0
                ? new Date(now.getTime() - reading.offsetSeconds * 1000)
                : now;
            return {
                deviceId: device.id,
                metric: 'temperature',
                value: reading.temperature,
                unit: 'celsius',
                timestamp,
            };
        });

        if (metricsToStore.length > 0) {
            await this.prisma.deviceMetric.createMany({
                data: metricsToStore
            });
        }

        // Store battery and RSSI if provided
        const extraMetrics = [];
        if (data.batteryLevel !== undefined) {
            extraMetrics.push({ deviceId: device.id, metric: 'battery_level', value: data.batteryLevel, unit: '%' });
        }
        if (data.rssi !== undefined) {
            extraMetrics.push({ deviceId: device.id, metric: 'wifi_rssi', value: data.rssi, unit: 'dBm' });
        }
        if (extraMetrics.length > 0) {
            await this.prisma.deviceMetric.createMany({ data: extraMetrics });
        }

        // Update device lastSeen and set ONLINE (device is actively reporting)
        await this.prisma.device.update({
            where: { id: device.id },
            data: { lastSeen: new Date(), status: 'ONLINE', updatedAt: new Date() }
        });

        // Alert logic — requires customerId (UNCLAIMED devices have none)
        let alertCreated = false;
        let alertResolved = false;
        const alertCustomerId = device.customerId;

        if (alertCustomerId) {
            // Get latest temperature from this batch
            const readings = data.readings ?? [];
            const latestTemp = readings.length > 0
                ? readings[readings.length - 1].temperature
                : undefined;

            if (data.alertPending && data.alertTemp !== undefined) {
                // Temperature exceeds threshold — create alert if none exists
                const severity = data.alertTemp > TEMP_CRITICAL ? 'CRITICAL' : 'WARNING';

                const existing = await this.prisma.alert.findFirst({
                    where: { deviceId: device.id, type: 'HIGH_TEMPERATURE' as any, resolved: false }
                });

                if (!existing) {
                    await this.prisma.alert.create({
                        data: {
                            deviceId: device.id,
                            userId: device.userId ?? undefined,
                            customerId: alertCustomerId,
                            type: 'HIGH_TEMPERATURE' as any,
                            severity: severity as any,
                            title: severity === 'CRITICAL' ? 'Freezer Critical Temperature' : 'Freezer Temperature Warning',
                            message: `Temperature reading of ${data.alertTemp.toFixed(1)}°C exceeds ${severity.toLowerCase()} threshold`
                        }
                    });
                    alertCreated = true;
                }
            } else if (latestTemp !== undefined && latestTemp <= TEMP_WARNING) {
                // Temperature back to normal — resolve any open alerts
                const openAlerts = await this.prisma.alert.findMany({
                    where: { deviceId: device.id, type: 'HIGH_TEMPERATURE' as any, resolved: false }
                });

                if (openAlerts.length > 0) {
                    await this.prisma.alert.updateMany({
                        where: { deviceId: device.id, type: 'HIGH_TEMPERATURE' as any, resolved: false },
                        data: {
                            resolved: true,
                            resolvedAt: new Date()
                        }
                    });
                    alertResolved = true;
                }
            }

            // Battery alerts
            if (data.batteryLevel !== undefined) {
                if (data.batteryLevel <= BATTERY_CRITICAL || data.batteryLevel <= BATTERY_WARNING) {
                    const severity = data.batteryLevel <= BATTERY_CRITICAL ? 'CRITICAL' : 'WARNING';

                    const existingBattery = await this.prisma.alert.findFirst({
                        where: { deviceId: device.id, type: 'LOW_BATTERY' as any, resolved: false }
                    });

                    if (!existingBattery) {
                        await this.prisma.alert.create({
                            data: {
                                deviceId: device.id,
                                userId: device.userId ?? undefined,
                                customerId: alertCustomerId,
                                type: 'LOW_BATTERY' as any,
                                severity: severity as any,
                                title: severity === 'CRITICAL' ? 'Battery Critically Low' : 'Battery Low',
                                message: `Battery at ${data.batteryLevel.toFixed(0)}% — charge the device soon`
                            }
                        });
                        alertCreated = true;
                    } else if (
                        existingBattery.severity === 'WARNING' &&
                        data.batteryLevel <= BATTERY_CRITICAL
                    ) {
                        // Escalate from WARNING to CRITICAL
                        await this.prisma.alert.update({
                            where: { id: existingBattery.id },
                            data: {
                                severity: 'CRITICAL' as any,
                                title: 'Battery Critically Low',
                                message: `Battery at ${data.batteryLevel.toFixed(0)}% — charge the device immediately`
                            }
                        });
                    }
                } else if (data.batteryLevel > BATTERY_WARNING) {
                    // Battery recovered — resolve open alerts
                    await this.prisma.alert.updateMany({
                        where: { deviceId: device.id, type: 'LOW_BATTERY' as any, resolved: false },
                        data: { resolved: true, resolvedAt: new Date() }
                    });
                }
            }
        }

        return {
            deviceId: device.id,
            readingsStored: metricsToStore.length,
            alertCreated,
            alertResolved
        };
    }
}
