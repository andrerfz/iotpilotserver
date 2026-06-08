/**
 * Helper functions for creating device metrics in tests
 * Converts old multi-field format to new key-value format
 */

import { PrismaClient } from '@prisma/client';

export interface LegacyMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  temperature?: number;
  networkUpload?: number;
  networkDownload?: number;
}

/**
 * Creates device metrics in the new key-value format
 * @param prisma Prisma client instance
 * @param deviceId Device ID
 * @param metrics Metrics object (old format)
 * @param timestamp Timestamp for all metrics
 * @returns Array of created metric records
 */
export async function createDeviceMetrics(
  prisma: PrismaClient,
  deviceId: string,
  metrics: LegacyMetrics,
  timestamp: Date = new Date()
): Promise<any[]> {
  const metricRecords: Array<{ deviceId: string; metric: string; value: number; unit?: string; timestamp: Date }> = [];

  if (metrics.cpuUsage !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'cpu_usage', 
      value: metrics.cpuUsage, 
      unit: '%', 
      timestamp 
    });
  }

  if (metrics.memoryUsage !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'memory_usage', 
      value: metrics.memoryUsage, 
      unit: '%', 
      timestamp 
    });
  }

  if (metrics.diskUsage !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'disk_usage', 
      value: metrics.diskUsage, 
      unit: '%', 
      timestamp 
    });
  }

  if (metrics.temperature !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'temperature', 
      value: metrics.temperature, 
      unit: '°C', 
      timestamp 
    });
  }

  if (metrics.networkUpload !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'network_upload', 
      value: metrics.networkUpload, 
      unit: 'bytes', 
      timestamp 
    });
  }

  if (metrics.networkDownload !== undefined) {
    metricRecords.push({ 
      deviceId, 
      metric: 'network_download', 
      value: metrics.networkDownload, 
      unit: 'bytes', 
      timestamp 
    });
  }

  // Create all metrics using createMany for better performance
  await prisma.deviceMetric.createMany({
    data: metricRecords
  });
  
  // Return the created records (note: createMany doesn't return the records)
  // For compatibility, we return the input data
  return metricRecords;
}

/**
 * Gets the latest value for a specific metric
 */
export async function getLatestMetricValue(
  prisma: PrismaClient,
  deviceId: string,
  metricName: string
): Promise<number | null> {
  const metric = await prisma.deviceMetric.findFirst({
    where: { deviceId, metric: metricName },
    orderBy: { timestamp: 'desc' }
  });
  
  return metric?.value ?? null;
}
