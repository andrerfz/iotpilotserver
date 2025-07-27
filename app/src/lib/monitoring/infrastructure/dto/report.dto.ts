/**
 * Data Transfer Object for Monitoring Report
 */
export class ReportDto {
  /**
   * The report ID
   */
  id: string;

  /**
   * The report name
   */
  name: string;

  /**
   * The report type (daily, weekly, monthly, custom)
   */
  type: string;

  /**
   * The report format (pdf, html, json)
   */
  format: string;

  /**
   * The customer ID associated with the report
   */
  customerId: string;

  /**
   * The timestamp when the report was generated
   */
  generatedAt: Date;

  /**
   * The start time of the report period
   */
  startTime: Date;

  /**
   * The end time of the report period
   */
  endTime: Date;

  /**
   * The user ID who generated the report
   */
  generatedBy?: string;

  /**
   * The URL where the report is stored
   */
  reportUrl?: string;

  /**
   * The recipients who received the report
   */
  recipients?: string[];

  /**
   * The status of the report (pending, generating, completed, failed)
   */
  status: string;

  /**
   * Optional error message if the report generation failed
   */
  errorMessage?: string;

  /**
   * Optional metadata for the report
   */
  metadata?: Record<string, any>;

  /**
   * Constructor for ReportDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<ReportDto> = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.type = data.type || '';
    this.format = data.format || '';
    this.customerId = data.customerId || '';
    this.generatedAt = data.generatedAt || new Date();
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    this.generatedBy = data.generatedBy;
    this.reportUrl = data.reportUrl;
    this.recipients = data.recipients;
    this.status = data.status || 'pending';
    this.errorMessage = data.errorMessage;
    this.metadata = data.metadata;
  }
}

/**
 * Data Transfer Object for creating a new Report
 */
export class CreateReportDto {
  /**
   * The report name
   */
  name: string;

  /**
   * The report type (daily, weekly, monthly, custom)
   */
  type: string;

  /**
   * The report format (pdf, html, json)
   */
  format: string;

  /**
   * The customer ID associated with the report
   */
  customerId: string;

  /**
   * The start time of the report period
   */
  startTime: Date;

  /**
   * The end time of the report period
   */
  endTime: Date;

  /**
   * The user ID who requested the report
   */
  generatedBy?: string;

  /**
   * The recipients who should receive the report
   */
  recipients?: string[];

  /**
   * Optional metadata for the report
   */
  metadata?: Record<string, any>;

  /**
   * Constructor for CreateReportDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<CreateReportDto> = {}) {
    this.name = data.name || '';
    this.type = data.type || '';
    this.format = data.format || '';
    this.customerId = data.customerId || '';
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    this.generatedBy = data.generatedBy;
    this.recipients = data.recipients;
    this.metadata = data.metadata;
  }
}

/**
 * Data Transfer Object for querying Reports
 */
export class QueryReportsDto {
  /**
   * The customer ID to filter by
   */
  customerId?: string;

  /**
   * The report type to filter by
   */
  type?: string;

  /**
   * The report status to filter by
   */
  status?: string;

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
   * The field to sort by
   */
  sortBy?: string;

  /**
   * The sort direction (asc or desc)
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Data Transfer Object for System Overview Report
 */
export class SystemOverviewReportDto {
  /**
   * The customer ID associated with the report
   */
  customerId: string;
  
  /**
   * Constructor for SystemOverviewReportDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<SystemOverviewReportDto> = {}) {
    this.customerId = data.customerId || '';
    this.generatedAt = data.generatedAt || new Date();
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    
    this.summary = data.summary || {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      activeAlerts: 0,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
      avgDiskUsage: 0
    };
    
    this.devices = data.devices || [];
    this.alerts = data.alerts || [];
    this.metrics = data.metrics || [];
  }

  /**
   * The timestamp when the report was generated
   */
  generatedAt: Date;

  /**
   * The start time of the report period
   */
  startTime: Date;

  /**
   * The end time of the report period
   */
  endTime: Date;

  /**
   * System summary statistics
   */
  summary: {
    /**
     * The total number of devices
     */
    totalDevices: number;

    /**
     * The number of online devices
     */
    onlineDevices: number;

    /**
     * The number of offline devices
     */
    offlineDevices: number;

    /**
     * The number of active alerts
     */
    activeAlerts: number;

    /**
     * The average CPU usage across all devices
     */
    avgCpuUsage: number;

    /**
     * The average memory usage across all devices
     */
    avgMemoryUsage: number;

    /**
     * The average disk usage across all devices
     */
    avgDiskUsage: number;
  };

  /**
   * Device status information
   */
  devices: {
    /**
     * The device ID
     */
    id: string;

    /**
     * The device name
     */
    name: string;

    /**
     * The device status (online, offline)
     */
    status: string;

    /**
     * The device CPU usage
     */
    cpuUsage: number;

    /**
     * The device memory usage
     */
    memoryUsage: number;

    /**
     * The device disk usage
     */
    diskUsage: number;

    /**
     * The device uptime in seconds
     */
    uptime: number;

    /**
     * The number of active alerts for this device
     */
    activeAlerts: number;
  }[];

  /**
   * Recent alerts
   */
  alerts: {
    /**
     * The alert ID
     */
    id: string;

    /**
     * The alert title
     */
    title: string;

    /**
     * The alert severity
     */
    severity: string;

    /**
     * The alert status
     */
    status: string;

    /**
     * The device ID associated with the alert
     */
    deviceId: string;

    /**
     * The device name associated with the alert
     */
    deviceName: string;

    /**
     * The timestamp when the alert was created
     */
    timestamp: Date;
  }[];

  /**
   * Performance metrics over time
   */
  metrics: {
    /**
     * The metric name
     */
    name: string;

    /**
     * The metric data points
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
  }[];
}

/**
 * Data Transfer Object for Device Performance Report
 */
export class DevicePerformanceReportDto {
  /**
   * The customer ID associated with the report
   */
  customerId: string;
  
  /**
   * Constructor for DevicePerformanceReportDto
   * @param data The data to initialize the DTO with
   */
  constructor(data: Partial<DevicePerformanceReportDto> = {}) {
    this.customerId = data.customerId || '';
    this.deviceId = data.deviceId || '';
    this.deviceName = data.deviceName || '';
    this.generatedAt = data.generatedAt || new Date();
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date();
    
    this.summary = data.summary || {
      status: 'unknown',
      uptimePercentage: 0,
      avgCpuUsage: 0,
      maxCpuUsage: 0,
      avgMemoryUsage: 0,
      maxMemoryUsage: 0,
      avgDiskUsage: 0,
      maxDiskUsage: 0,
      activeAlerts: 0,
      totalAlerts: 0
    };
    
    this.metrics = data.metrics || [];
    this.alerts = data.alerts || [];
  }

  /**
   * The device ID associated with the report
   */
  deviceId: string;

  /**
   * The device name
   */
  deviceName: string;

  /**
   * The timestamp when the report was generated
   */
  generatedAt: Date;

  /**
   * The start time of the report period
   */
  startTime: Date;

  /**
   * The end time of the report period
   */
  endTime: Date;

  /**
   * Device summary statistics
   */
  summary: {
    /**
     * The device status (online, offline)
     */
    status: string;

    /**
     * The device uptime percentage
     */
    uptimePercentage: number;

    /**
     * The average CPU usage
     */
    avgCpuUsage: number;

    /**
     * The maximum CPU usage
     */
    maxCpuUsage: number;

    /**
     * The average memory usage
     */
    avgMemoryUsage: number;

    /**
     * The maximum memory usage
     */
    maxMemoryUsage: number;

    /**
     * The average disk usage
     */
    avgDiskUsage: number;

    /**
     * The maximum disk usage
     */
    maxDiskUsage: number;

    /**
     * The number of active alerts
     */
    activeAlerts: number;

    /**
     * The total number of alerts during the period
     */
    totalAlerts: number;
  };

  /**
   * Performance metrics over time
   */
  metrics: {
    /**
     * The metric name
     */
    name: string;

    /**
     * The metric data points
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
  }[];

  /**
   * Alerts for this device during the period
   */
  alerts: {
    /**
     * The alert ID
     */
    id: string;

    /**
     * The alert title
     */
    title: string;

    /**
     * The alert severity
     */
    severity: string;

    /**
     * The alert status
     */
    status: string;

    /**
     * The timestamp when the alert was created
     */
    timestamp: Date;

    /**
     * The metric name that triggered the alert
     */
    metricName: string;

    /**
     * The metric value that triggered the alert
     */
    metricValue: number;

    /**
     * The threshold value that was breached
     */
    thresholdValue: number;
  }[];
}