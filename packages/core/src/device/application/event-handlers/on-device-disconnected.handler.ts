import type { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import type { DeviceDisconnectedEvent } from '@iotpilot/core/device/domain/events/device-disconnected.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Handles DeviceDisconnectedEvent by enqueuing a delayed health check job.
 * 30-second delay allows the device time to reconnect before checking.
 * Ungraceful disconnections get higher priority.
 */
export class OnDeviceDisconnectedHandler implements EventHandler<DeviceDisconnectedEvent> {
  constructor(private readonly jobQueue: JobQueue) {}

  async handle(event: DeviceDisconnectedEvent): Promise<void> {
    await this.jobQueue.enqueue(
      {
        jobType: 'device-health-check',
        tenantId: event.tenantId.value,
        payload: {
          deviceId: event.deviceId.value,
          deviceName: event.deviceName.value,
          disconnectionTimestamp: event.disconnectionTimestamp.toISOString(),
          disconnectionReason: event.disconnectionReason,
          wasGraceful: event.wasGraceful,
        },
        metadata: {
          sourceEvent: 'DeviceDisconnectedEvent',
          correlationId: event.eventId,
        },
      },
      {
        delay: 30_000, // 30 seconds for potential reconnection
        priority: event.wasGraceful ? 10 : 3,
      }
    );
  }
}
