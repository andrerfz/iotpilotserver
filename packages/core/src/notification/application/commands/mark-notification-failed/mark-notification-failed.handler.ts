import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';
import { MarkNotificationFailedCommand } from './mark-notification-failed.command';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationNotFoundException } from '@iotpilot/core/notification/domain/exceptions/notification-not-found.exception';
import { NotificationFailedEvent } from '@iotpilot/core/notification/domain/events/notification-failed.event';

export class MarkNotificationFailedHandler implements CommandHandler<MarkNotificationFailedCommand, void> {
  constructor(
    private readonly recordRepo: NotificationRecordRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: MarkNotificationFailedCommand): Promise<void> {
    const record = await this.recordRepo.findById(command.notificationRecordId, command.customerId);
    if (!record) throw new NotificationNotFoundException(command.notificationRecordId.getValue());

    record.markAsFailed(command.errorMessage);
    await this.recordRepo.save(record);

    await this.eventBus.publish(new NotificationFailedEvent(
      record.getId().getValue(),
      record.getCustomerId().getValue(),
      record.userId,
      record.channel.value,
      record.type.value,
      record.status.value as 'FAILED' | 'DEAD',
      record.attemptCount.getValue(),
      record.maxAttempts.getValue(),
      record.errorMessage?.getValue() ?? null,
      record.sourceEventId.getValue(),
    ));
  }
}
