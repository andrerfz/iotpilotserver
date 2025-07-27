import {Alert, AlertEntity} from '../entities/alert.entity';
import {AlertId} from '../value-objects/alert-id.vo';
import {Threshold} from '../entities/threshold.entity';
import {Metric} from '../entities/metric.entity';
import {AlertTriggeredEvent} from '../events/alert-triggered.event';
import {AlertStatus} from '../value-objects/alert-status.vo';
import {MetricValue} from '../value-objects/metric-value.vo';

/**
 * Domain service responsible for creating alerts based on threshold evaluations
 */
export class AlertCreator {
    /**
     * Creates a new alert when a threshold is breached by a metric
     * 
     * @param threshold The threshold that was breached
     * @param metric The metric that breached the threshold
     * @returns The created alert
     */
    createAlertFromThresholdBreach(threshold: Threshold, metric: Metric): AlertEntity {
        // Validate that the threshold and metric belong to the same tenant
        if (!threshold.getTenantId().equals(metric.getTenantId())) {
            throw new Error('Threshold and metric must belong to the same tenant');
        }

        // Validate that the threshold applies to the device or is global
        if (threshold.deviceId !== null && !threshold.deviceId.equals(metric.deviceId)) {
            throw new Error('Threshold does not apply to the device that produced the metric');
        }

        // Create the alert
        const alertId = AlertId.create();
        const title = `${threshold.name} threshold breached`;
        const message = this.generateAlertMessage(threshold, metric);
        const metadata = {
            metricName: metric.name,
            metricValue: metric.value.value,
            metricUnit: metric.value.unit,
            thresholdValue: threshold.value,
            thresholdOperator: threshold.operator,
            timestamp: metric.timestamp.toISOString()
        };

        const alert = Alert.create(
            alertId,
            title,
            message,
            threshold.severity,
            AlertStatus.create('ACTIVE'), // New alerts are always active
            metric.deviceId,
            threshold.getTenantId(),
            metric.name,
            MetricValue.create(metric.value.value, metric.value.unit),
            threshold.value,
            threshold.id,
            metric.timestamp,
            undefined, // Not acknowledged
            undefined, // No acknowledgedBy
            undefined, // Not resolved
            undefined, // No resolvedBy
            metadata.timestamp ? metadata.timestamp.toString() : undefined
        );

        // Add the alert triggered event
        alert.addEvent(new AlertTriggeredEvent(
            alertId,
            metric.deviceId,
            threshold.id,
            threshold.severity,
            threshold.getTenantId()
        ));

        return alert;
    }

    /**
     * Generates a descriptive message for the alert based on the threshold and metric
     * 
     * @param threshold The threshold that was breached
     * @param metric The metric that breached the threshold
     * @returns A descriptive message for the alert
     */
    private generateAlertMessage(threshold: Threshold, metric: Metric): string {
        const operatorText = this.getOperatorText(threshold.operator);
        
        return `${metric.name} value of ${metric.value.value} ${metric.value.unit} is ${operatorText} threshold of ${threshold.value} ${threshold.unit}`;
    }

    /**
     * Converts a comparison operator to a human-readable text
     * 
     * @param operator The comparison operator
     * @returns A human-readable text representation of the operator
     */
    private getOperatorText(operator: string): string {
        switch (operator) {
            case '>':
                return 'greater than';
            case '>=':
                return 'greater than or equal to';
            case '<':
                return 'less than';
            case '<=':
                return 'less than or equal to';
            case '==':
                return 'equal to';
            case '!=':
                return 'not equal to';
            default:
                return operator;
        }
    }
}