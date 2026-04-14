import type { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import type { MetricsCollectedEvent } from '@iotpilot/core/device/domain/events/metrics-collected.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Handles MetricsCollectedEvent by enqueuing metrics processing jobs.
 * If the event indicates alerts were triggered, also enqueues a threshold breach check.
 */
export class OnMetricsCollectedHandler implements EventHandler<MetricsCollectedEvent> {
  constructor(private readonly jobQueue: JobQueue) {}

  async handle(event: MetricsCollectedEvent): Promise<void> {
    // Always enqueue metrics processing
    await this.jobQueue.enqueue(
      {
        jobType: 'process-device-metrics',
        tenantId: event.tenantId.value,
        payload: {
          deviceId: event.deviceId.value,
          deviceName: event.deviceName.value,
          cpuUsage: event.getCpuUsage(),
          memoryUsage: event.getMemoryUsage(),
          diskUsage: event.getDiskUsage(),
          temperature: event.getTemperature(),
          networkTraffic: event.getNetworkTraffic(),
          collectionTimestamp: event.collectionTimestamp.toISOString(),
          hasAlerts: event.hasAlerts,
        },
        metadata: {
          sourceEvent: 'MetricsCollectedEvent',
          correlationId: event.eventId,
        },
      },
      {
        priority: 8,
      }
    );

    // If alerts were triggered, also check threshold breaches with higher priority
    if (event.hasAlerts) {
      await this.jobQueue.enqueue(
        {
          jobType: 'check-threshold-breach',
          tenantId: event.tenantId.value,
          payload: {
            deviceId: event.deviceId.value,
            deviceName: event.deviceName.value,
            cpuUsage: event.getCpuUsage(),
            memoryUsage: event.getMemoryUsage(),
            diskUsage: event.getDiskUsage(),
            temperature: event.getTemperature(),
          },
          metadata: {
            sourceEvent: 'MetricsCollectedEvent',
            correlationId: event.eventId,
          },
        },
        {
          priority: 2,
        }
      );
    }
  }
}
