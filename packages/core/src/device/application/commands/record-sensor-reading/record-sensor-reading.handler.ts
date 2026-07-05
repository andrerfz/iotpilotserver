import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {RecordSensorReadingCommand} from './record-sensor-reading.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import type {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {AlertTriggeredEvent} from '@iotpilot/core/monitoring/domain/events/alert-triggered.event';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

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
    private readonly eventBus?: EventBus;

    constructor(prismaService: PrismaService, eventBus?: EventBus) {
        this.prismaService = prismaService;
        this.eventBus = eventBus;
    }

    /**
     * Publish AlertTriggeredEvent so the notification pipeline (routing →
     * dispatch → email) fires. Gated downstream by the user's alertNotifications
     * toggle. Never let a notification failure break reading ingestion.
     *
     * `severity` here is this handler's own local WARNING/CRITICAL vocabulary,
     * which doesn't match AlertSeverity.fromString()'s accepted values
     * (LOW/MEDIUM/HIGH/CRITICAL) — every WARNING alert threw here and was
     * silently swallowed by the catch below, so it never actually notified.
     * Map it the same way PrismaAlertRepository does when reading alerts back.
     */
    private async publishAlertTriggered(
        alertId: string, deviceBizId: string, customerId: string, severity: string,
        title: string, message: string, deviceName: string,
    ): Promise<void> {
        if (!this.eventBus) return;
        try {
            const domainSeverity = severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
            await this.eventBus.publish(new AlertTriggeredEvent(
                AlertId.fromString(alertId),
                DeviceId.create(deviceBizId),
                ThresholdId.create(),
                AlertSeverity.fromString(domainSeverity),
                CustomerId.create(customerId),
                title,
                message,
                deviceName,
            ));
        } catch {
            // notifications are best-effort; ingestion must not fail because of them
        }
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    /**
     * Load the device's effective alert thresholds from the `thresholds` table
     * (the single source of truth managed by the "Umbrales" modal). For each
     * metric a device-scoped threshold (deviceId = this device) overrides the
     * tenant-wide global threshold (deviceId = null); when neither exists we fall
     * back to the legacy hardcoded freezer defaults so unconfigured devices keep
     * alerting exactly as before.
     *
     * The query is scoped to the device's own customerId, so a threshold planted
     * under another tenant can never apply here (cross-tenant isolation). We only
     * read the stored `value` per metric — the warn/crit severity split is derived
     * here (crit = warn + offset for temperature, half for battery) to preserve the
     * existing escalation behavior with the modal's single-value-per-metric model.
     */
    private async loadThresholds(deviceId: string, customerId: string): Promise<DeviceThresholds> {
        const rows = await this.prisma.threshold.findMany({
            where: {
                customerId,
                metricName: { in: ['sensor_temp', 'battery'] },
                enabled: true,
                deletedAt: null,
                OR: [{ deviceId }, { deviceId: null }],
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Device-scoped threshold wins over the global (deviceId = null) default.
        const pick = (metric: string): number | undefined => {
            const deviceRow = rows.find(r => r.metricName === metric && r.deviceId === deviceId);
            if (deviceRow) return deviceRow.value;
            return rows.find(r => r.metricName === metric && r.deviceId === null)?.value;
        };

        const configuredTemp = pick('sensor_temp');
        const tempWarn = configuredTemp ?? DEFAULT_TEMP_WARNING;
        const batteryWarn = pick('battery') ?? DEFAULT_BATTERY_WARNING;

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

        // An UNCLAIMED device must not be silently promoted to ONLINE by
        // telemetry. Claiming is an explicit, authorized action; until it
        // happens the reading is rejected so a device cannot re-adopt itself
        // just by holding a key. Mirrors the ProcessHeartbeat guard.
        if (device.status === 'UNCLAIMED') {
            throw new Error('Device is not claimed. Claim the device before sending readings.');
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

        // Update device lastSeen and set ONLINE (device is actively reporting),
        // and denormalize the latest sensor reading onto the device row so the
        // device list can show a sensor's own metrics without joining
        // device_metrics. Use the most recent reading in the batch.
        const latestReading = (data.readings ?? [])[data.readings?.length ? data.readings.length - 1 : 0];
        await this.prisma.device.update({
            where: { id: device.id },
            data: {
                lastSeen: new Date(),
                status: 'ONLINE',
                updatedAt: new Date(),
                ...(latestReading?.temperature !== undefined ? { temperature: latestReading.temperature } : {}),
                ...(data.batteryLevel !== undefined ? { batteryLevel: data.batteryLevel } : {}),
                ...(data.rssi !== undefined ? { signalStrength: data.rssi } : {}),
            }
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
                    const created = await this.prisma.alert.create({
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
                    await this.publishAlertTriggered(created.id, device.deviceId, alertCustomerId, severity, created.title, created.message, device.name ?? device.hostname ?? device.deviceId);
                } else if (existing.severity === 'WARNING' && severity === 'CRITICAL') {
                    // Escalate from WARNING to CRITICAL
                    const title = 'Freezer Critical Temperature';
                    const message = `Temperature reading of ${evalTemp.toFixed(1)}°C exceeds critical threshold (${thresholds.tempCrit.toFixed(1)}°C)`;
                    await this.prisma.alert.update({
                        where: { id: existing.id },
                        data: { severity: 'CRITICAL' as any, title, message },
                    });
                    await this.publishAlertTriggered(existing.id, device.deviceId, alertCustomerId, severity, title, message, device.name ?? device.hostname ?? device.deviceId);
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
                        const created = await this.prisma.alert.create({
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
                        await this.publishAlertTriggered(created.id, device.deviceId, alertCustomerId, severity, created.title, created.message, device.name ?? device.hostname ?? device.deviceId);
                    } else if (
                        existingBattery.severity === 'WARNING' &&
                        data.batteryLevel <= thresholds.batteryCrit
                    ) {
                        // Escalate from WARNING to CRITICAL
                        const title = 'Battery Critically Low';
                        const message = `Battery at ${data.batteryLevel.toFixed(0)}% — charge the device immediately`;
                        await this.prisma.alert.update({
                            where: { id: existingBattery.id },
                            data: { severity: 'CRITICAL' as any, title, message },
                        });
                        await this.publishAlertTriggered(existingBattery.id, device.deviceId, alertCustomerId, 'CRITICAL', title, message, device.name ?? device.hostname ?? device.deviceId);
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
