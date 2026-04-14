import type { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import type { DeviceRegisteredEvent } from '@iotpilot/core/device/domain/events/device-registered.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Handles DeviceRegisteredEvent by enqueuing a notification job.
 * Low priority — informational only.
 */
export class OnDeviceRegisteredHandler implements EventHandler<DeviceRegisteredEvent> {
  constructor(private readonly jobQueue: JobQueue) {}

  async handle(event: DeviceRegisteredEvent): Promise<void> {
    await this.jobQueue.enqueue(
      {
        jobType: 'device-registered-notification',
        tenantId: event.tenantId.value,
        payload: {
          deviceId: event.deviceId.value,
          deviceName: event.deviceName.value,
          ipAddress: event.ipAddress.value,
          status: event.status.value,
        },
        metadata: {
          sourceEvent: 'DeviceRegisteredEvent',
          correlationId: event.eventId,
        },
      },
      {
        priority: 10,
      }
    );
  }
}
