import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import {ServiceContainer} from '@iotpilot/core/shared/infrastructure/container/service-container';

/**
 * Processes device metrics for storage and anomaly detection.
 * Stores metrics as DeviceMetric rows via Prisma.
 */
export class ProcessDeviceMetricsProcessor implements JobProcessor {
  readonly jobType = 'process-device-metrics';

  async process(data: JobData): Promise<JobResult> {
    const {
      deviceId,
      deviceName,
      cpuUsage,
      memoryUsage,
      diskUsage,
      temperature,
      networkTraffic,
      collectionTimestamp,
      hasAlerts,
    } = data.payload;

    console.log(
      `[ProcessDeviceMetricsProcessor] Processing metrics for ${deviceName} (${deviceId}): ` +
      `cpu=${cpuUsage}% mem=${memoryUsage}% disk=${diskUsage}% temp=${temperature ?? 'N/A'}C ` +
      `network=${networkTraffic} hasAlerts=${hasAlerts} tenant=${data.tenantId}`
    );

    // Store metrics via Prisma
    try {
      const prisma = ServiceContainer.getInstance().getPrismaClient();
      const timestamp = collectionTimestamp ? new Date(String(collectionTimestamp)) : new Date();

      const metricsToStore = [
        cpuUsage != null && { metric: 'cpu_usage', value: cpuUsage, unit: '%' },
        memoryUsage != null && { metric: 'memory_usage', value: memoryUsage, unit: '%' },
        diskUsage != null && { metric: 'disk_usage', value: diskUsage, unit: '%' },
        temperature != null && { metric: 'cpu_temp', value: temperature, unit: '°C' },
      ].filter(Boolean) as { metric: string; value: number; unit: string }[];

      if (metricsToStore.length > 0) {
        await prisma.getClient().deviceMetric.createMany({
          data: metricsToStore.map(m => ({
            deviceId: String(deviceId),
            metric: m.metric,
            value: m.value,
            unit: m.unit,
            timestamp,
          })),
        });
      }
    } catch (err) {
      console.warn(`[ProcessDeviceMetricsProcessor] Failed to store metrics: ${(err as Error).message}`);
    }

    return {
      success: true,
      data: {
        deviceId,
        cpuUsage,
        memoryUsage,
        diskUsage,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
