export interface DeviceMetricsDTO {
  id: string;
  deviceId: string;
  cpu: number;
  memory: number;
  disk: number;
  networkUpload: number;
  networkDownload: number;
  timestamp: string;
}

export interface DeviceMetricsListItemDTO {
  deviceId: string;
  cpu: number;
  memory: number;
  disk: number;
  timestamp: string;
}

export interface DeviceMetricsSummaryDTO {
  deviceId: string;
  averageCpu: number;
  maxCpu: number;
  averageMemory: number;
  maxMemory: number;
  averageDisk: number;
  maxDisk: number;
  totalNetworkUpload: number;
  totalNetworkDownload: number;
  startTime: string;
  endTime: string;
  samplesCount: number;
}

export interface DeviceMetricsFilterDTO {
  deviceId?: string;
  startTime?: string;
  endTime?: string;
  minCpu?: number;
  maxCpu?: number;
  minMemory?: number;
  maxMemory?: number;
  minDisk?: number;
  maxDisk?: number;
}

export interface DeviceMetricsTimeSeriesDTO {
  deviceId: string;
  metrics: {
    timestamp: string;
    cpu: number;
    memory: number;
    disk: number;
    networkUpload: number;
    networkDownload: number;
  }[];
  startTime: string;
  endTime: string;
  interval: string; // e.g., '1h', '5m', '30s'
}

export interface DeviceMetricsThresholdDTO {
  deviceId: string;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  networkUploadThreshold: number;
  networkDownloadThreshold: number;
}