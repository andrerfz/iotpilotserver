/**
 * Data Transfer Object for Metric
 */
export class MetricDto {
  /**
   * The metric ID
   */
  id: string;

  /**
   * The metric name
   */
  name: string;

  /**
   * The metric value
   */
  value: number;

  /**
   * The metric unit
   */
  unit: string;

  /**
   * The timestamp when the metric was recorded
   */
  timestamp: Date;

  /**
   * The device ID associated with the metric
   */
  deviceId: string;

  /**
   * The customer ID associated with the metric
   */
  customerId: string;

  /**
   * Optional tags for the metric
   */
  tags?: Record<string, string>;
  
  /**
   * Constructor for MetricDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<MetricDto> = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.value = data.value || 0;
    this.unit = data.unit || '';
    this.timestamp = data.timestamp || new Date();
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.tags = data.tags;
  }
}

/**
 * Data Transfer Object for creating a new Metric
 */
export class CreateMetricDto {
  /**
   * The metric name
   */
  name: string;

  /**
   * The metric value
   */
  value: number;

  /**
   * The metric unit
   */
  unit: string;

  /**
   * The device ID associated with the metric
   */
  deviceId: string;

  /**
   * The customer ID associated with the metric
   */
  customerId: string;

  /**
   * Optional timestamp when the metric was recorded (defaults to now)
   */
  timestamp?: Date;

  /**
   * Optional tags for the metric
   */
  tags?: Record<string, string>;
  
  /**
   * Constructor for CreateMetricDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<CreateMetricDto> = {}) {
    this.name = data.name || '';
    this.value = data.value || 0;
    this.unit = data.unit || '';
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.timestamp = data.timestamp;
    this.tags = data.tags;
  }
}

/**
 * Data Transfer Object for querying metrics
 */
export class QueryMetricsDto {
  /**
   * The device ID to filter by
   */
  deviceId?: string;

  /**
   * The customer ID to filter by
   */
  customerId?: string;

  /**
   * The metric name to filter by
   */
  name?: string;

  /**
   * The start time for the query
   */
  startTime?: Date;

  /**
   * The end time for the query
   */
  endTime?: Date;

  /**
   * The maximum number of results to return
   */
  limit?: number;

  /**
   * Tags to filter by
   */
  tags?: Record<string, string>;
}

/**
 * Data Transfer Object for metric statistics
 */
export class MetricStatisticsDto {
  /**
   * The metric name
   */
  name: string;

  /**
   * The average value
   */
  average: number;

  /**
   * The minimum value
   */
  minimum: number;

  /**
   * The maximum value
   */
  maximum: number;

  /**
   * The sum of all values
   */
  sum: number;

  /**
   * The number of data points
   */
  count: number;

  /**
   * The metric unit
   */
  unit: string;

  /**
   * The start time for the statistics
   */
  startTime: Date;

  /**
   * The end time for the statistics
   */
  endTime: Date;

  /**
   * The device ID associated with the statistics
   */
  deviceId: string;

  /**
   * The customer ID associated with the statistics
   */
  customerId: string;

  /**
   * Constructor for MetricStatisticsDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<MetricStatisticsDto> = {}) {
    this.name = data.name || '';
    this.average = data.average || 0;
    this.minimum = data.minimum || 0;
    this.maximum = data.maximum || 0;
    this.sum = data.sum || 0;
    this.count = data.count || 0;
    this.unit = data.unit || '';
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
  }
}

/**
 * Data Transfer Object for a metric time series
 */
export class MetricTimeSeriesDto {
  /**
   * The metric name
   */
  name: string;

  /**
   * The metric unit
   */
  unit: string;

  /**
   * The device ID associated with the time series
   */
  deviceId: string;

  /**
   * The customer ID associated with the time series
   */
  customerId: string;

  /**
   * The data points in the time series
   */
  dataPoints: {
    /**
     * The timestamp of the data point
     */
    timestamp: Date;

    /**
     * The value of the data point
     */
    value: number;
  }[];

  /**
   * Constructor for MetricTimeSeriesDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<MetricTimeSeriesDto> = {}) {
    this.name = data.name || '';
    this.unit = data.unit || '';
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.dataPoints = data.dataPoints || [];
  }
}