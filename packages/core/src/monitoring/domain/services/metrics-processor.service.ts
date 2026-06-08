import {Metric} from '../entities/metric.entity';
import {MetricValue} from '../value-objects/metric-value.vo';
import {TimeRange} from '../value-objects/time-range.vo';
import {MetricRecordedEvent} from '../events/metric-recorded.event';

/**
 * Domain service responsible for processing and aggregating metrics
 */
export class MetricsProcessor {
    /**
     * Calculates the average value of a set of metrics
     * 
     * @param metrics The metrics to calculate the average for
     * @returns The average value or null if no metrics are provided
     */
    calculateAverage(metrics: Metric[]): MetricValue | null {
        if (metrics.length === 0) {
            return null;
        }

        // Validate that all metrics have the same unit
        const firstUnit = metrics[0].value.unit;
        const allSameUnit = metrics.every(metric => metric.value.unit === firstUnit);
        if (!allSameUnit) {
            throw new Error('Cannot calculate average for metrics with different units');
        }

        // Calculate the average
        const sum = metrics.reduce((acc, metric) => acc + metric.value.value, 0);
        const average = sum / metrics.length;

        return MetricValue.create(average, firstUnit);
    }

    /**
     * Calculates the maximum value of a set of metrics
     * 
     * @param metrics The metrics to calculate the maximum for
     * @returns The maximum value or null if no metrics are provided
     */
    calculateMaximum(metrics: Metric[]): MetricValue | null {
        if (metrics.length === 0) {
            return null;
        }

        // Validate that all metrics have the same unit
        const firstUnit = metrics[0].value.unit;
        const allSameUnit = metrics.every(metric => metric.value.unit === firstUnit);
        if (!allSameUnit) {
            throw new Error('Cannot calculate maximum for metrics with different units');
        }

        // Calculate the maximum
        const maxValue = Math.max(...metrics.map(metric => metric.value.value));

        return MetricValue.create(maxValue, firstUnit);
    }

    /**
     * Calculates the minimum value of a set of metrics
     * 
     * @param metrics The metrics to calculate the minimum for
     * @returns The minimum value or null if no metrics are provided
     */
    calculateMinimum(metrics: Metric[]): MetricValue | null {
        if (metrics.length === 0) {
            return null;
        }

        // Validate that all metrics have the same unit
        const firstUnit = metrics[0].value.unit;
        const allSameUnit = metrics.every(metric => metric.value.unit === firstUnit);
        if (!allSameUnit) {
            throw new Error('Cannot calculate minimum for metrics with different units');
        }

        // Calculate the minimum
        const minValue = Math.min(...metrics.map(metric => metric.value.value));

        return MetricValue.create(minValue, firstUnit);
    }

    /**
     * Filters metrics by a specific time range
     * 
     * @param metrics The metrics to filter
     * @param timeRange The time range to filter by
     * @returns The filtered metrics
     */
    filterByTimeRange(metrics: Metric[], timeRange: TimeRange): Metric[] {
        return metrics.filter(metric => timeRange.includes(metric.timestamp));
    }

    /**
     * Groups metrics by a specific tag
     * 
     * @param metrics The metrics to group
     * @param tagKey The tag key to group by
     * @returns A map of tag values to metrics
     */
    groupByTag(metrics: Metric[], tagKey: string): Map<string, Metric[]> {
        const result = new Map<string, Metric[]>();

        for (const metric of metrics) {
            if (metric.hasTag(tagKey)) {
                const tagValue = metric.getTag(tagKey);
                if (tagValue) {
                    if (!result.has(tagValue)) {
                        result.set(tagValue, []);
                    }
                    result.get(tagValue)?.push(metric);
                }
            }
        }

        return result;
    }

    /**
     * Records a new metric and raises a MetricRecorded event
     * 
     * @param metric The metric to record
     * @returns The recorded metric with the event added
     */
    recordMetric(metric: Metric): Metric {
        // Add the metric recorded event
        metric.addEvent(new MetricRecordedEvent(
            metric.id,
            metric.deviceId,
            metric.name,
            metric.value,
            metric.timestamp,
            metric.getTenantId()
        ));

        return metric;
    }
}