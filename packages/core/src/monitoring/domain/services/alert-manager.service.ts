import {Alert} from '../entities/alert.entity';
import {AlertId} from '../value-objects/alert-id.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';
import {AlertStatus} from '../value-objects/alert-status.vo';
import {MetricValue} from '../value-objects/metric-value.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {AlertRepository} from '../interfaces/alert-repository.interface';
import {ThresholdRepository} from '../interfaces/threshold-repository.interface';

export interface CreateAlertParams {
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    deviceId: DeviceId;
    customerId: CustomerId;
    metricName: string;
    metricValue: number;
    thresholdValue: number;
    thresholdId: ThresholdId;
    notes?: string;
}

export interface AlertStatistics {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: {
        info: number;
        warning: number;
        error: number;
        critical: number;
    };
}

/**
 * Domain service for managing alerts
 * Encapsulates business logic for alert operations
 */
export class AlertManager {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly thresholdRepository: ThresholdRepository
    ) {}

    /**
     * Create a new alert
     */
    async createAlert(params: CreateAlertParams): Promise<Alert> {
        const alertId = AlertId.generate();
        const severity = AlertSeverity.create(params.severity);
        const status = AlertStatus.create('ACTIVE');
        const metricValue = MetricValue.create(params.metricValue, params.metricName);

        const alert = Alert.create(
            alertId,
            params.title,
            params.message,
            severity,
            status,
            params.deviceId,
            params.customerId,
            params.metricName,
            metricValue,
            params.thresholdValue,
            params.thresholdId,
            new Date(),
            undefined,
            undefined,
            undefined,
            undefined,
            params.notes
        );

        await this.alertRepository.save(alert);
        return alert;
    }

    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(
        alertId: AlertId,
        userId: string,
        customerId: CustomerId
    ): Promise<Alert> {
        const alert = await this.alertRepository.findById(alertId, customerId);
        
        if (!alert) {
            throw new Error(`Alert with ID ${alertId.getValue()} not found`);
        }

        alert.acknowledge(UserId.fromString(userId));
        await this.alertRepository.save(alert);

        return alert;
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(
        alertId: AlertId,
        userId: string,
        customerId: CustomerId
    ): Promise<Alert> {
        const alert = await this.alertRepository.findById(alertId, customerId);
        
        if (!alert) {
            throw new Error(`Alert with ID ${alertId.getValue()} not found`);
        }

        alert.resolve();
        await this.alertRepository.save(alert);

        return alert;
    }

    /**
     * Get alerts for a device
     */
    async getDeviceAlerts(
        deviceId: DeviceId,
        customerId: CustomerId,
        includeResolved: boolean = false
    ): Promise<Alert[]> {
        const alerts = await this.alertRepository.findByDeviceId(deviceId, customerId);
        
        if (!includeResolved) {
            return alerts.filter(alert => !alert.isResolved());
        }
        
        return alerts;
    }

    /**
     * Get active alerts count for a device
     */
    async getActiveAlertsCount(
        deviceId: DeviceId,
        customerId: CustomerId
    ): Promise<number> {
        const alerts = await this.alertRepository.findByDeviceId(deviceId, customerId);
        return alerts.filter(alert => alert.isActive()).length;
    }

    /**
     * Get alert statistics for a tenant
     */
    async getAlertStatistics(customerId: CustomerId): Promise<AlertStatistics> {
        const alerts = await this.alertRepository.findAll(customerId);
        
        const stats: AlertStatistics = {
            total: alerts.length,
            active: 0,
            acknowledged: 0,
            resolved: 0,
            bySeverity: {
                info: 0,
                warning: 0,
                error: 0,
                critical: 0
            }
        };

        for (const alert of alerts) {
            if (alert.isActive()) stats.active++;
            else if (alert.status.isAcknowledged()) stats.acknowledged++;
            else if (alert.isResolved()) stats.resolved++;

            const severityValue = alert.severity.getValue().toLowerCase();
            if (severityValue in stats.bySeverity) {
                stats.bySeverity[severityValue as keyof typeof stats.bySeverity]++;
            }
        }

        return stats;
    }

    /**
     * Bulk resolve alerts for a device
     */
    async resolveAlertsForDevice(
        deviceId: DeviceId,
        userId: string,
        customerId: CustomerId
    ): Promise<number> {
        const alerts = await this.alertRepository.findByDeviceId(deviceId, customerId);
        let resolvedCount = 0;

        for (const alert of alerts) {
            if (!alert.isResolved()) {
                alert.resolve();
                await this.alertRepository.save(alert);
                resolvedCount++;
            }
        }

        return resolvedCount;
    }

    /**
     * Check if an alert should be created based on cooldown
     * Prevents duplicate alerts within cooldown period
     */
    async shouldCreateAlert(
        deviceId: DeviceId,
        thresholdId: ThresholdId,
        customerId: CustomerId
    ): Promise<boolean> {
        // Get the threshold to check cooldown
        const threshold = await this.thresholdRepository.findById(thresholdId, customerId);
        if (!threshold) {
            return true; // If threshold not found, allow alert creation
        }

        // Get recent alerts for this device and threshold
        const recentAlerts = await this.alertRepository.findByThresholdId(
            thresholdId,
            customerId
        );

        if (recentAlerts.length === 0) {
            return true;
        }

        // Check if the most recent unresolved alert is within cooldown period
        const activeAlerts = recentAlerts.filter(a => !a.isResolved());
        if (activeAlerts.length === 0) {
            return true;
        }

        const mostRecent = activeAlerts.reduce((a, b) => 
            a.timestamp > b.timestamp ? a : b
        );

        const cooldownMs = threshold.cooldownMinutes * 60 * 1000;
        const timeSinceLastAlert = Date.now() - mostRecent.timestamp.getTime();

        return timeSinceLastAlert > cooldownMs;
    }
}

