import {AlertId} from '../domain/value-objects/alert-id.vo';
import {AlertSeverity} from '../domain/value-objects/alert-severity.vo';
import {AlertStatus} from '../domain/value-objects/alert-status.vo';
import {AlertType} from '../domain/value-objects/alert-type.vo';
import {MetricId} from '../domain/value-objects/metric-id.vo';
import {MetricValue} from '../domain/value-objects/metric-value.vo';
import {ThresholdId} from '../domain/value-objects/threshold-id.vo';
import {TimeRange} from '../domain/value-objects/time-range.vo';
import {MonitoringReport, MonitoringReportId} from '../domain/entities/monitoring-report.entity';
import {ReportStatus} from '../domain/value-objects/report-status.vo';
import {Alert, AlertEntity} from '../domain/entities/alert.entity';
import {Metric} from '../domain/entities/metric.entity';
import {Threshold} from '../domain/entities/threshold.entity';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

/**
 * Factory for creating monitoring entities and related objects for testing
 */
export class MonitoringTestFactory {
    /**
     * Create an alert entity with default values
     * @param alertId Optional alert ID (generated if not provided)
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param thresholdId Threshold ID
     * @param severity Optional severity (default: WARNING)
     * @param status Optional status (default: ACTIVE)
     * @returns An alert entity
     */
    static createAlert(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId: ThresholdId,
        alertId?: string,
        severity: string = 'WARNING',
        status: string = 'ACTIVE'
    ): Alert {
        const alertSeverity = AlertSeverity.create(severity as any);
        const alertStatus = AlertStatus.create(status as any);
        const alertType = AlertType.fromString('CPU_USAGE');

        const alert = AlertEntity.create(
            AlertId.create(),
            `High ${'cpu_usage'} detected`,
            `High ${'cpu_usage'} detected`,
            alertSeverity,
            alertStatus,
            deviceId, // Pass DeviceId directly, not wrapped in DeviceId.create()
            customerId,
            'cpu_usage', // metricName
            MetricValue.create(95, '%'), // metricValue
            90, // thresholdValue
            thresholdId, // thresholdId
            new Date(), // createdAt
            undefined, // acknowledgedAt
            undefined, // acknowledgedBy
            undefined, // resolvedAt
            undefined, // resolvedBy
            `Metric: cpu_usage exceeded threshold`, // notes
            alertType,
            undefined // metadata
        );

        // Clear events to avoid side effects in tests
        alert.clearEvents();

        return alert;
    }

    /**
     * Create a critical alert
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param thresholdId Threshold ID
     * @returns A critical alert entity
     */
    static createCriticalAlert(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId: ThresholdId
    ): Alert {
        return this.createAlert(customerId, deviceId, thresholdId, undefined, 'CRITICAL', 'ACTIVE');
    }

    /**
     * Create a resolved alert
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param thresholdId Threshold ID
     * @returns A resolved alert entity
     */
    static createResolvedAlert(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId: ThresholdId
    ): Alert {
        const alert = this.createAlert(customerId, deviceId, thresholdId, undefined, 'WARNING', 'ACTIVE');
        alert.resolve();
        return alert;
    }

    /**
     * Create an acknowledged alert
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param thresholdId Threshold ID
     * @returns An acknowledged alert entity
     */
    static createAcknowledgedAlert(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId: ThresholdId
    ): Alert {
        const alert = this.createAlert(customerId, deviceId, thresholdId, undefined, 'WARNING', 'ACTIVE');
        alert.acknowledge(UserId.create('test-user-id'));
        return alert;
    }

    /**
     * Create a metric entity with default values
     * @param metricId Optional metric ID (generated if not provided)
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param metricType Optional metric type (default: cpu_usage)
     * @param value Optional metric value (default: 45.5)
     * @returns A metric entity
     */
    static createMetric(
        customerId: CustomerId,
        deviceId: DeviceId,
        metricId?: string,
        metricType: string = 'cpu_usage',
        value: number = 45.5,
        unit: string = '%'
    ): Metric {
        const id = MetricId.create(metricId || crypto.randomUUID());
        const metricValue = MetricValue.create(value, unit);

        const metric = Metric.create(
            id,
            deviceId,
            metricType,
            metricValue,
            new Date(),
            new Map<string, string>(),
            customerId
        );

        // Clear events to avoid side effects in tests
        metric.clearEvents();

        return metric;
    }

    /**
     * Create a CPU usage metric
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param value CPU usage percentage
     * @returns A CPU usage metric entity
     */
    static createCpuMetric(
        customerId: CustomerId,
        deviceId: DeviceId,
        value: number = 45.5
    ): Metric {
        return this.createMetric(customerId, deviceId, undefined, 'cpu_usage', value);
    }

    /**
     * Create a memory usage metric
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param value Memory usage percentage
     * @returns A memory usage metric entity
     */
    static createMemoryMetric(
        customerId: CustomerId,
        deviceId: DeviceId,
        value: number = 65.2
    ): Metric {
        return this.createMetric(customerId, deviceId, undefined, 'memory_usage', value);
    }

    /**
     * Create a disk usage metric
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param value Disk usage percentage
     * @returns A disk usage metric entity
     */
    static createDiskMetric(
        customerId: CustomerId,
        deviceId: DeviceId,
        value: number = 78.9
    ): Metric {
        return this.createMetric(customerId, deviceId, undefined, 'disk_usage', value);
    }

    /**
     * Create a threshold entity with default values
     * @param thresholdId Optional threshold ID (generated if not provided)
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param metricType Optional metric type (default: cpu_usage)
     * @param operator Optional operator (default: gt)
     * @param thresholdValue Optional threshold value (default: 80)
     * @param severity Optional severity (default: WARNING)
     * @returns A threshold entity
     */
    static createThreshold(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId?: string,
        metricType: string = 'cpu_usage',
        operator: string = 'gt',
        thresholdValue: number = 80,
        severity: string = 'WARNING'
    ): Threshold {
        const id = ThresholdId.create(thresholdId || crypto.randomUUID());
        const alertSeverity = AlertSeverity.create(severity as any);

        const threshold = Threshold.create(
            id,
            deviceId,
            `${metricType} Threshold`,
            `Threshold for ${metricType}`,
            metricType,
            operator as any,
            thresholdValue,
            'unit',
            alertSeverity,
            'STATIC' as any,
            5,
            {},
            customerId
        );

        // Clear events to avoid side effects in tests
        threshold.clearEvents();

        return threshold;
    }

    /**
     * Create a critical threshold
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param metricType Metric type
     * @param thresholdValue Threshold value
     * @returns A critical threshold entity
     */
    static createCriticalThreshold(
        customerId: CustomerId,
        deviceId: DeviceId,
        metricType: string = 'memory_usage',
        thresholdValue: number = 90
    ): Threshold {
        return this.createThreshold(
            customerId,
            deviceId,
            undefined,
            metricType,
            'gt',
            thresholdValue,
            'CRITICAL'
        );
    }

    /**
     * Create a disabled threshold
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @returns A disabled threshold entity
     */
    static createDisabledThreshold(
        customerId: CustomerId,
        deviceId: DeviceId
    ): Threshold {
        const threshold = this.createThreshold(customerId, deviceId);
        threshold.disable();
        return threshold;
    }

    /**
     * Create a monitoring report entity with default values
     * @param reportId Optional report ID (generated if not provided)
     * @param customerId Customer ID
     * @param timeRange Time range for the report
     * @param status Optional status (default: COMPLETED)
     * @returns A monitoring report entity
     */
    static createMonitoringReport(
        customerId: CustomerId,
        timeRange: TimeRange,
        reportId?: string,
        status: string = 'COMPLETED'
    ): MonitoringReport {
        const id = MonitoringReportId.create(reportId || crypto.randomUUID());
        const reportStatus = ReportStatus.create(status as any);

        const report = MonitoringReport.create(
            id,
            `Report for ${timeRange.startTime.toISOString()} - ${timeRange.endTime.toISOString()}`,
            `Generated monitoring report`,
            'PERFORMANCE' as any,
            timeRange,
            [],
            'JSON' as any,
            'test-user',
            {},
            customerId
        );

        // Clear events to avoid side effects in tests
        report.clearEvents();

        return report;
    }

    /**
     * Create a time range value object
     * @param startDate Start date
     * @param endDate End date
     * @returns A time range value object
     */
    static createTimeRange(
        startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endDate: Date = new Date()
    ): TimeRange {
        return TimeRange.create(startDate, endDate);
    }

    /**
     * Create a one-hour time range
     * @param endDate Optional end date (default: now)
     * @returns A one-hour time range
     */
    static createOneHourTimeRange(endDate: Date = new Date()): TimeRange {
        const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 hour ago
        return TimeRange.create(startDate, endDate);
    }

    /**
     * Create a 24-hour time range
     * @param endDate Optional end date (default: now)
     * @returns A 24-hour time range
     */
    static create24HourTimeRange(endDate: Date = new Date()): TimeRange {
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        return TimeRange.create(startDate, endDate);
    }

    /**
     * Create a 7-day time range
     * @param endDate Optional end date (default: now)
     * @returns A 7-day time range
     */
    static create7DayTimeRange(endDate: Date = new Date()): TimeRange {
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        return TimeRange.create(startDate, endDate);
    }

    /**
     * Create multiple alerts for testing
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param thresholdId Threshold ID
     * @param count The number of alerts to create
     * @returns An array of alert entities
     */
    static createMultipleAlerts(
        customerId: CustomerId,
        deviceId: DeviceId,
        thresholdId: ThresholdId,
        count: number
    ): Alert[] {
        const alerts: Alert[] = [];
        const severities = ['WARNING', 'CRITICAL', 'INFO'];

        for (let i = 0; i < count; i++) {
            const severity = severities[i % severities.length];
            alerts.push(this.createAlert(
                customerId,
                deviceId,
                thresholdId,
                undefined,
                severity,
                'ACTIVE'
            ));
        }

        return alerts;
    }

    /**
     * Create multiple metrics for testing
     * @param customerId Customer ID
     * @param deviceId Device ID
     * @param count The number of metrics to create
     * @returns An array of metric entities
     */
    static createMultipleMetrics(
        customerId: CustomerId,
        deviceId: DeviceId,
        count: number
    ): Metric[] {
        const metrics: Metric[] = [];
        const metricTypes = ['cpu_usage', 'memory_usage', 'disk_usage', 'network_rx', 'network_tx'];

        for (let i = 0; i < count; i++) {
            const metricType = metricTypes[i % metricTypes.length];
            const value = Math.random() * 100; // Random value between 0-100
            metrics.push(this.createMetric(
                customerId,
                deviceId,
                undefined,
                metricType,
                value
            ));
        }

        return metrics;
    }
}
