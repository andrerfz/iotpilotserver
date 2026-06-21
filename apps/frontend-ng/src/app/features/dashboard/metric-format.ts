const METRIC_PRECISION: Record<string, number> = {
  temperature: 1,
  sensor_temp: 1,
  battery_level: 2,
};

/**
 * Format a sensor/system metric value for display.
 * Precision per metric type is defined once here — import this instead of
 * writing per-page toFixed() calls.
 */
export function formatMetric(value: number | null | undefined, metricKey: string): string {
  if (value == null) return '--';
  const precision = METRIC_PRECISION[metricKey] ?? 0;
  return value.toFixed(precision);
}
