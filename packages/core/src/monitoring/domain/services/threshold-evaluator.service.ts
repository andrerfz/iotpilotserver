import {Threshold} from '../entities/threshold.entity';
import {Metric} from '../entities/metric.entity';
import {AlertCreator} from './alert-creator.service';
import {AlertEntity} from '../entities/alert.entity';
import {ThresholdBreachedEvent} from '../events/threshold-breached.event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Domain service responsible for evaluating metrics against thresholds
 */
export class ThresholdEvaluator {
    constructor(private readonly alertCreator: AlertCreator) {}

    /**
     * Evaluates a metric against a threshold to determine if an alert should be triggered
     * 
     * @param threshold The threshold to evaluate against
     * @param metric The metric to evaluate
     * @returns true if the threshold is breached, false otherwise
     */
    evaluateThreshold(threshold: Threshold, metric: Metric): boolean {
        // Validate that the threshold and metric belong to the same tenant
        if (!threshold.getTenantId().equals(metric.getTenantId())) {
            throw new Error('Threshold and metric must belong to the same tenant');
        }

        // Validate that the threshold applies to the device or is global
        if (threshold.deviceId !== null && !threshold.deviceId.equals(metric.deviceId)) {
            return false; // Threshold doesn't apply to this device
        }

        // Validate that the threshold is enabled
        if (!threshold.isEnabled()) {
            return false; // Threshold is disabled
        }

        // Validate that the metric name matches the threshold's metric name
        if (metric.name !== threshold.metricName) {
            return false; // Metric name doesn't match
        }

        // Evaluate the metric value against the threshold
        return threshold.evaluateMetric(metric.value.value);
    }

    /**
     * Evaluates a metric against multiple thresholds and creates alerts for breached thresholds
     * 
     * @param thresholds The thresholds to evaluate against
     * @param metric The metric to evaluate
     * @returns An array of alerts created for breached thresholds
     */
    evaluateThresholds(thresholds: Threshold[], metric: Metric): AlertEntity[] {
        const alerts: AlertEntity[] = [];

        for (const threshold of thresholds) {
            if (this.evaluateThreshold(threshold, metric)) {
                // Threshold is breached, create an alert
                const alert = this.alertCreator.createAlertFromThresholdBreach(threshold, metric);
                
                // Add the threshold breached event to the threshold
                threshold.addEvent(new ThresholdBreachedEvent(
                    threshold.id,
                    metric.id,
                    metric.deviceId,
                    metric.value,
                    threshold.getTenantId()
                ));
                
                alerts.push(alert);
            }
        }

        return alerts;
    }

    /**
     * Filters thresholds that are applicable to a specific device
     * 
     * @param thresholds All available thresholds
     * @param deviceId The device ID to filter for
     * @param tenantId The tenant ID for validation
     * @returns Thresholds that apply to the specified device (including global thresholds)
     */
    getApplicableThresholds(thresholds: Threshold[], deviceId: string, tenantId: CustomerId): Threshold[] {
        return thresholds.filter(threshold => {
            // Validate tenant
            if (!threshold.getTenantId().equals(tenantId)) {
                return false;
            }
            
            // Include if threshold is global or applies to this device
            return threshold.isGlobal() || 
                  (threshold.deviceId !== null && threshold.deviceId.value === deviceId);
        });
    }
}