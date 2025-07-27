/**
 * Data Transfer Object for Alert
 */
export class AlertDto {
  /**
   * The alert ID
   */
  id: string;

  /**
   * The alert title
   */
  title: string;

  /**
   * The alert description
   */
  description: string;

  /**
   * The alert severity (critical, high, medium, low)
   */
  severity: string;

  /**
   * The alert status (active, acknowledged, resolved)
   */
  status: string;

  /**
   * The device ID associated with the alert
   */
  deviceId: string;

  /**
   * The customer ID associated with the alert
   */
  customerId: string;

  /**
   * The metric name that triggered the alert
   */
  metricName: string;

  /**
   * The metric value that triggered the alert
   */
  metricValue: number;

  /**
   * The unit of the metric value
   */
  metricUnit: string;

  /**
   * The threshold value that was breached
   */
  thresholdValue: number;

  /**
   * The threshold ID that was breached
   */
  thresholdId: string;

  /**
   * The timestamp when the alert was created
   */
  timestamp: Date;

  /**
   * The timestamp when the alert was acknowledged (if applicable)
   */
  acknowledgedAt?: Date;

  /**
   * The user ID who acknowledged the alert (if applicable)
   */
  acknowledgedBy?: string;

  /**
   * The timestamp when the alert was resolved (if applicable)
   */
  resolvedAt?: Date;

  /**
   * The user ID who resolved the alert (if applicable)
   */
  resolvedBy?: string;

  /**
   * Optional notes about the alert
   */
  notes?: string;
  
  /**
   * Constructor for AlertDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<AlertDto> = {}) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.severity = data.severity || '';
    this.status = data.status || '';
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.metricName = data.metricName || '';
    this.metricValue = data.metricValue || 0;
    this.metricUnit = data.metricUnit || '';
    this.thresholdValue = data.thresholdValue || 0;
    this.thresholdId = data.thresholdId || '';
    this.timestamp = data.timestamp || new Date();
    this.acknowledgedAt = data.acknowledgedAt;
    this.acknowledgedBy = data.acknowledgedBy;
    this.resolvedAt = data.resolvedAt;
    this.resolvedBy = data.resolvedBy;
    this.notes = data.notes;
  }
}

/**
 * Data Transfer Object for creating a new Alert
 */
export class CreateAlertDto {
  /**
   * The alert title
   */
  title: string;

  /**
   * The alert description
   */
  description: string;

  /**
   * The alert severity (critical, high, medium, low)
   */
  severity: string;

  /**
   * The device ID associated with the alert
   */
  deviceId: string;

  /**
   * The customer ID associated with the alert
   */
  customerId: string;

  /**
   * The metric name that triggered the alert
   */
  metricName: string;

  /**
   * The metric value that triggered the alert
   */
  metricValue: number;

  /**
   * The unit of the metric value
   */
  metricUnit: string;

  /**
   * The threshold value that was breached
   */
  thresholdValue: number;

  /**
   * The threshold ID that was breached
   */
  thresholdId: string;

  /**
   * Optional notes about the alert
   */
  notes?: string;
  
  /**
   * Constructor for CreateAlertDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<CreateAlertDto> = {}) {
    this.title = data.title || '';
    this.description = data.description || '';
    this.severity = data.severity || '';
    this.deviceId = data.deviceId || '';
    this.customerId = data.customerId || '';
    this.metricName = data.metricName || '';
    this.metricValue = data.metricValue || 0;
    this.metricUnit = data.metricUnit || '';
    this.thresholdValue = data.thresholdValue || 0;
    this.thresholdId = data.thresholdId || '';
    this.notes = data.notes;
  }
}

/**
 * Data Transfer Object for updating an Alert
 */
export class UpdateAlertDto {
  /**
   * The alert status (active, acknowledged, resolved)
   */
  status?: string;

  /**
   * The user ID who acknowledged or resolved the alert
   */
  userId?: string;

  /**
   * Notes about the alert update
   */
  notes?: string;
}

/**
 * Data Transfer Object for acknowledging an Alert
 */
export class AcknowledgeAlertDto {
  /**
   * The alert ID to acknowledge
   */
  alertId: string;

  /**
   * The user ID who acknowledged the alert
   */
  userId: string;

  /**
   * The customer ID associated with the alert
   */
  customerId: string;

  /**
   * Optional notes about the acknowledgement
   */
  notes?: string;
  
  /**
   * Constructor for AcknowledgeAlertDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<AcknowledgeAlertDto> = {}) {
    this.alertId = data.alertId || '';
    this.userId = data.userId || '';
    this.customerId = data.customerId || '';
    this.notes = data.notes;
  }
}

/**
 * Data Transfer Object for resolving an Alert
 */
export class ResolveAlertDto {
  /**
   * The alert ID to resolve
   */
  alertId: string;

  /**
   * The user ID who resolved the alert
   */
  userId: string;

  /**
   * The customer ID associated with the alert
   */
  customerId: string;

  /**
   * Optional notes about the resolution
   */
  notes?: string;
  
  /**
   * Constructor for ResolveAlertDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<ResolveAlertDto> = {}) {
    this.alertId = data.alertId || '';
    this.userId = data.userId || '';
    this.customerId = data.customerId || '';
    this.notes = data.notes;
  }
}

/**
 * Data Transfer Object for querying Alerts
 */
export class QueryAlertsDto {
  /**
   * The customer ID to filter by
   */
  customerId: string;

  /**
   * The device ID to filter by
   */
  deviceId?: string;

  /**
   * The alert status to filter by
   */
  status?: string;

  /**
   * The alert severity to filter by
   */
  severity?: string;

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
   * The number of results to skip
   */
  offset?: number;
  
  /**
   * Constructor for QueryAlertsDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<QueryAlertsDto> = {}) {
    this.customerId = data.customerId || '';
    this.deviceId = data.deviceId;
    this.status = data.status;
    this.severity = data.severity;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.limit = data.limit;
    this.offset = data.offset;
    this.sortBy = data.sortBy;
  }

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
 * Data Transfer Object for Alert statistics
 */
export class AlertStatisticsDto {
  /**
   * The customer ID associated with the statistics
   */
  customerId: string;

  /**
   * The total number of alerts
   */
  totalAlerts: number;

  /**
   * The number of active alerts
   */
  activeAlerts: number;

  /**
   * The number of acknowledged alerts
   */
  acknowledgedAlerts: number;

  /**
   * The number of resolved alerts
   */
  resolvedAlerts: number;

  /**
   * The number of critical alerts
   */
  criticalAlerts: number;

  /**
   * The number of high alerts
   */
  highAlerts: number;

  /**
   * The number of medium alerts
   */
  mediumAlerts: number;

  /**
   * The number of low alerts
   */
  lowAlerts: number;

  /**
   * The start time for the statistics
   */
  startTime: Date;

  /**
   * The end time for the statistics
   */
  endTime: Date;

  /**
   * Statistics by device
   */
  byDevice?: {
    /**
     * The device ID
     */
    deviceId: string;

    /**
     * The device name
     */
    deviceName: string;

    /**
     * The total number of alerts for this device
     */
    totalAlerts: number;

    /**
     * The number of active alerts for this device
     */
    activeAlerts: number;
  }[];
  
  /**
   * Constructor for AlertStatisticsDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<AlertStatisticsDto> = {}) {
    this.customerId = data.customerId || '';
    this.totalAlerts = data.totalAlerts || 0;
    this.activeAlerts = data.activeAlerts || 0;
    this.acknowledgedAlerts = data.acknowledgedAlerts || 0;
    this.resolvedAlerts = data.resolvedAlerts || 0;
    this.criticalAlerts = data.criticalAlerts || 0;
    this.highAlerts = data.highAlerts || 0;
    this.mediumAlerts = data.mediumAlerts || 0;
    this.lowAlerts = data.lowAlerts || 0;
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    this.byDevice = data.byDevice;
  }
}