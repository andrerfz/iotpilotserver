import type { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import { NotificationDispatchedEvent } from '@iotpilot/core/notification/domain/events/notification-dispatched.event';

export class OnNotificationDispatchedHandler implements EventHandler<NotificationDispatchedEvent> {
  constructor(private readonly jobQueue: JobQueue) {}

  async handle(event: NotificationDispatchedEvent): Promise<void> {
    await this.jobQueue.enqueue(
      {
        jobType: 'dispatch-notification-channel',
        tenantId: event.customerId,
        payload: {
          notificationRecordId: event.notificationRecordId,
          customerId: event.customerId,
          channel: event.channel,
          type: event.type,
        },
        metadata: {
          correlationId: event.eventId,
          sourceEvent: 'NotificationDispatchedEvent',
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}
