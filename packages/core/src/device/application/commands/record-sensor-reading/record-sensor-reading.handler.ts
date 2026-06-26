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

// Fallback thresholds, used when a device has no configured DEVICE_SETTINGS
// preference. These preserve the original hardcoded freezer behavior so devices
// that were never configured keep alerting exactly as before.
const DEFAULT_TEMP_WARNING  = -15.0;  // temp above this → warning
const DEFAULT_BATTERY_WARNING  = 20;  // battery at/below this → warning
// The freezer-critical line sits 5°C warmer than the warning line (matching the
// original -15 / -10 pair); the battery-critical line is half the warning line
// (matching the original 20 / 10 pair).
const TEMP_CRITICAL_OFFSET = 5.0;

interface DeviceThresholds {
    tempWarn: number;   // temperature above this → WARNING
    tempCrit: number;   // temperature above this → CRITICAL
    tempConfigured: boolean; // true only if sensorTempThreshold was explicitly set
    batteryWarn: number; // battery at/below this → WARNING
    batteryCrit: number; // battery at/below this → CRITICAL
}

export class RecordSensorReadingHandler implements CommandHandler<RecordSensorReadingCommand, SensorReadingResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    /**
     * Load the device's configurable alert thresholds from its DEVICE_SETTINGS
     * preferences (the values the device-settings UI saves), falling back to the
     * legacy hardcoded freezer defaults when a device has none configured.
     *
     * Preferences are keyed `device_<internalId>_<setting>` and stored as strings.
     * We match on the key (which embeds the unique internal device id) and scope to
     * preferences owned by a user in the device's own tenant, so a preference row
     * planted under another tenant's user cannot tamper with this device's alert
     * thresholds (cross-tenant IDOR defense-in-depth).
     */
    private async loadThresholds(deviceId: string, customerId: string): Promise<DeviceThresholds> {
        const prefs = await this.prisma.userPreference.findMany({
            where: {
                category: 'DEVICE_SETTINGS',
                key: { in: [`device_${deviceId}_batteryThreshold`, `device_${deviceId}_sensorTempThreshold`] },
                user: { customerId }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const read = (suffix: string): number | undefined => {
            const pref = prefs.find(p => p.key === `device_${deviceId}_${suffix}`);
            if (!pref) return undefined;
            const n = parseFloat(pref.value);
            return Number.isFinite(n) ? n : undefined;
        };

        const configuredTemp = read('sensorTempThreshold');
        const tempWarn = configuredTemp ?? DEFAULT_TEMP_WARNING;
        const batteryWarn = read('batteryThreshold') ?? DEFAULT_BATTERY_WARNING;

        return {
            tempWarn,
            tempCrit: tempWarn + TEMP_CRITICAL_OFFSET,
            tempConfigured: configuredTemp !== undefined,
            batteryWarn,
            batteryCrit: Math.floor(batteryWarn / 2)
        };
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
            // Per-device configurable thresholds (fall back to legacy defaults)
            const thresholds = await this.loadThresholds(device.id, alertCustomerId);

            // Get latest temperature from this batch
            const readings = data.readings ?? [];
            const latestTemp = readings.length > 0
                ? readings[readings.length - 1].temperature
                : undefined;

            // Temperature is breached either because the device flagged it
            // (alertPending/alertTemp) or because the server evaluates the latest
            // reading above the configured warning line. Server-side evaluation is
            // opt-in: it only applies when the operator explicitly set
            // sensorTempThreshold — otherwise a warm (non-freezer) device reporting
            // positive temps with no flag would wrongly trip the freezer default.
            // The flagged temp wins for severity since it is the value that tripped
            // the device.
            const flagTemp = (data.alertPending && data.alertTemp !== undefined) ? data.alertTemp : undefined;
            const evalTemp = flagTemp ?? latestTemp;
            const tempBreached =
                flagTemp !== undefined ||
                (thresholds.tempConfigured && latestTemp !== undefined && latestTemp > thresholds.tempWarn);

            if (tempBreached && evalTemp !== undefined) {
                const severity = evalTemp > thresholds.tempCrit ? 'CRITICAL' : 'WARNING';

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
                            message: `Temperature reading of ${evalTemp.toFixed(1)}°C exceeds ${severity.toLowerCase()} threshold (${thresholds.tempWarn.toFixed(1)}°C)`
                        }
                    });
                    alertCreated = true;
                } else if (existing.severity === 'WARNING' && severity === 'CRITICAL') {
                    // Escalate from WARNING to CRITICAL
                    await this.prisma.alert.update({
                        where: { id: existing.id },
                        data: {
                            severity: 'CRITICAL' as any,
                            title: 'Freezer Critical Temperature',
                            message: `Temperature reading of ${evalTemp.toFixed(1)}°C exceeds critical threshold (${thresholds.tempCrit.toFixed(1)}°C)`
                        }
                    });
                }
            } else if (latestTemp !== undefined && latestTemp <= thresholds.tempWarn) {
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
                if (data.batteryLevel <= thresholds.batteryWarn) {
                    const severity = data.batteryLevel <= thresholds.batteryCrit ? 'CRITICAL' : 'WARNING';

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
                        data.batteryLevel <= thresholds.batteryCrit
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
                } else {
                    // Battery above warning line — resolve open alerts
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
