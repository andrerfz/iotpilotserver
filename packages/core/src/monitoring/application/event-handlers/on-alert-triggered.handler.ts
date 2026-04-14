import type { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import type { AlertTriggeredEvent } from '@iotpilot/core/monitoring/domain/events/alert-triggered.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Handles AlertTriggeredEvent by enqueuing a Slack notification job.
 * Critical alerts get higher priority and more retry attempts.
 */
export class OnAlertTriggeredHandler implements EventHandler<AlertTriggeredEvent> {
  constructor(private readonly jobQueue: JobQueue) {}

  async handle(event: AlertTriggeredEvent): Promise<void> {
    const severity = event.severity.value;
    const isCritical = severity === 'CRITICAL' || severity === 'HIGH';

    await this.jobQueue.enqueue(
      {
        jobType: 'send-slack-alert-notification',
        tenantId: event.tenantId.value,
        payload: {
          alertId: event.alertId.value,
          deviceId: event.deviceId.value,
          thresholdId: event.thresholdId.value,
          severity,
        },
        metadata: {
          sourceEvent: 'AlertTriggeredEvent',
          correlationId: event.eventId,
        },
      },
      {
        priority: isCritical ? 1 : 5,
        attempts: isCritical ? 5 : 3,
      }
    );
  }
}
