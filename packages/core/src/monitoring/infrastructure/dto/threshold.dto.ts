/**
 * Data Transfer Object for Threshold
 */
export class ThresholdDto {
  /**
   * The threshold ID
   */
  id: string;

  /**
   * The threshold name
   */
  name: string;

  /**
   * The threshold description
   */
  description: string;

  /**
   * The metric name to monitor
   */
  metricName: string;

  /**
   * The comparison operator (gt, lt, gte, lte, eq, neq)
   */
  operator: string;

  /**
   * The threshold value
   */
  value: number;

  /**
   * The unit of the threshold value
   */
  unit: string;

  /**
   * The alert severity when threshold is breached (critical, high, medium, low)
   */
  severity: string;

  /**
   * The device ID associated with the threshold (null for global thresholds)
   */
  deviceId?: string;

  /**
   * The customer ID associated with the threshold
   */
  customerId: string;

  /**
   * Whether the threshold is enabled
   */
  enabled: boolean;

  /**
   * The cooldown period in seconds before triggering another alert
   */
  cooldownSeconds: number;

  /**
   * The timestamp when the threshold was created
   */
  createdAt: Date;

  /**
   * The timestamp when the threshold was last updated
   */
  updatedAt: Date;

  /**
   * The user ID who created the threshold
   */
  createdBy?: string;

  /**
   * The user ID who last updated the threshold
   */
  updatedBy?: string;

  /**
   * Optional tags for the threshold
   */
  tags?: Record<string, string>;

  /**
   * Constructor for ThresholdDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<ThresholdDto> = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.metricName = data.metricName || '';
    this.operator = data.operator || 'gt';
    this.value = data.value || 0;
    this.unit = data.unit || '';
    this.severity = data.severity || 'medium';
    this.deviceId = data.deviceId;
    this.customerId = data.customerId || '';
    this.enabled = data.enabled ?? true;
    this.cooldownSeconds = data.cooldownSeconds || 300;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.tags = data.tags;
  }
}

/**
 * Data Transfer Object for creating a new Threshold
 */
export class CreateThresholdDto {
  /**
   * The threshold name
   */
  name: string;

  /**
   * The threshold description
   */
  description: string;

  /**
   * The metric name to monitor
   */
  metricName: string;

  /**
   * The comparison operator (gt, lt, gte, lte, eq, neq)
   */
  operator: string;

  /**
   * The threshold value
   */
  value: number;

  /**
   * The unit of the threshold value
   */
  unit: string;

  /**
   * The alert severity when threshold is breached (critical, high, medium, low)
   */
  severity: string;

  /**
   * The device ID associated with the threshold (null for global thresholds)
   */
  deviceId?: string;

  /**
   * The customer ID associated with the threshold
   */
  customerId: string;

  /**
   * Whether the threshold is enabled (defaults to true)
   */
  enabled?: boolean;

  /**
   * The cooldown period in seconds before triggering another alert (defaults to 300)
   */
  cooldownSeconds?: number;

  /**
   * The user ID who created the threshold
   */
  createdBy?: string;

  /**
   * Optional tags for the threshold
   */
  tags?: Record<string, string>;

  /**
   * Constructor for CreateThresholdDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<CreateThresholdDto> = {}) {
    this.name = data.name || '';
    this.description = data.description || '';
    this.metricName = data.metricName || '';
    this.operator = data.operator || 'gt';
    this.value = data.value || 0;
    this.unit = data.unit || '';
    this.severity = data.severity || 'medium';
    this.deviceId = data.deviceId;
    this.customerId = data.customerId || '';
    this.enabled = data.enabled;
    this.cooldownSeconds = data.cooldownSeconds;
    this.createdBy = data.createdBy;
    this.tags = data.tags;
  }
}

/**
 * Data Transfer Object for updating a Threshold
 */
export class UpdateThresholdDto {
  /**
   * The threshold name
   */
  name?: string;

  /**
   * The threshold description
   */
  description?: string;

  /**
   * The metric name to monitor
   */
  metricName?: string;

  /**
   * The comparison operator (gt, lt, gte, lte, eq, neq)
   */
  operator?: string;

  /**
   * The threshold value
   */
  value?: number;

  /**
   * The unit of the threshold value
   */
  unit?: string;

  /**
   * The alert severity when threshold is breached (critical, high, medium, low)
   */
  severity?: string;

  /**
   * Whether the threshold is enabled
   */
  enabled?: boolean;

  /**
   * The cooldown period in seconds before triggering another alert
   */
  cooldownSeconds?: number;

  /**
   * The user ID who updated the threshold
   */
  updatedBy?: string;

  /**
   * Optional tags for the threshold
   */
  tags?: Record<string, string>;
}

/**
 * Data Transfer Object for querying Thresholds
 */
export class QueryThresholdsDto {
  /**
   * The customer ID to filter by
   */
  customerId?: string;

  /**
   * The device ID to filter by
   */
  deviceId?: string;

  /**
   * The metric name to filter by
   */
  metricName?: string;

  /**
   * The severity to filter by
   */
  severity?: string;

  /**
   * Whether to include only enabled thresholds
   */
  enabledOnly?: boolean;

  /**
   * The maximum number of results to return
   */
  limit?: number;

  /**
   * The number of results to skip
   */
  offset?: number;

  /**
   * The field to sort by
   */
  sortBy?: string;

  /**
   * The sort direction (asc or desc)
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Data Transfer Object for evaluating a Threshold
 */
export class EvaluateThresholdDto {
  /**
   * The threshold ID to evaluate
   */
  thresholdId: string;

  /**
   * The metric value to evaluate
   */
  metricValue: number;

  /**
   * The metric name
   */
  metricName: string;

  /**
   * The device ID associated with the metric
   */
  deviceId: string;

  /**
   * The customer ID associated with the metric
   */
  customerId: string;

  /**
   * The timestamp of the metric value
   */
  timestamp: Date;

  /**
   * Constructor for EvaluateThresholdDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<EvaluateThresholdDto> = {}) {
    this.thresholdId = data.thresholdId || '';
    this.metricValue = data.metricValue || 0;
    this.metricName = data.metricName || '';
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.timestamp = data.timestamp || new Date();
  }
}