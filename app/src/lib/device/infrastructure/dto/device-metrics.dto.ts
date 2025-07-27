/**
 * Data Transfer Object for DeviceMetrics entity
 */
export interface DeviceMetricsDTO {
  id: string;
  deviceId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  networkTraffic: number;
  timestamp: string;
}

/**
 * Data Transfer Object for DeviceMetrics summary
 */
export interface DeviceMetricsSummaryDTO {
  deviceId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  networkTraffic: number;
  timestamp: string;
}

/**
 * Data Transfer Object for DeviceMetrics history
 */
export interface DeviceMetricsHistoryDTO {
  deviceId: string;
  metrics: {
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    temperature: number;
    networkTraffic: number;
  }[];
}

/**
 * Data Transfer Object for DeviceMetrics query parameters
 */
export interface DeviceMetricsQueryDTO {
  deviceId: string;
  startDate?: string;
  endDate?: string;
  interval?: string; // e.g., '1m', '5m', '1h'
  limit?: number;
}

/**
 * Data Transfer Object for DeviceMetrics alert
 */
export interface DeviceMetricsAlertDTO {
  deviceId: string;
  metricName: string;
  value: number;
  threshold: number;
  exceededBy: number;
  timestamp: string;
}

/**
 * Data Transfer Object for DeviceMetrics alert configuration
 */
export interface DeviceMetricsAlertConfigDTO {
  deviceId: string;
  cpuUsageThreshold?: number;
  memoryUsageThreshold?: number;
  diskUsageThreshold?: number;
  temperatureThreshold?: number;
  networkTrafficThreshold?: number;
  enabled: boolean;
}

/**
 * Data Transfer Object for DeviceMetrics dashboard
 */
export interface DeviceMetricsDashboardDTO {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  alertCount: number;
  metrics: {
    deviceId: string;
    deviceName: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    temperature: number;
    networkTraffic: number;
    status: string;
    timestamp: string;
  }[];
}