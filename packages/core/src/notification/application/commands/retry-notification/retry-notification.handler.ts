import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';
import { RetryNotificationCommand } from './retry-notification.command';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationNotFoundException } from '@iotpilot/core/notification/domain/exceptions/notification-not-found.exception';
import { NotificationAlreadyTerminalException } from '@iotpilot/core/notification/domain/exceptions/notification-already-terminal.exception';
import { NotificationDispatchedEvent } from '@iotpilot/core/notification/domain/events/notification-dispatched.event';

export class RetryNotificationHandler implements CommandHandler<RetryNotificationCommand, void> {
  constructor(
    private readonly recordRepo: NotificationRecordRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: RetryNotificationCommand): Promise<void> {
    const record = await this.recordRepo.findById(command.notificationRecordId, command.customerId);
    if (!record) throw new NotificationNotFoundException(command.notificationRecordId.getValue());

    if (!record.status.isRetryable()) {
      throw new NotificationAlreadyTerminalException(record.getId().getValue(), record.status.value);
    }

    record.resetForRetry();
    await this.recordRepo.save(record);

    await this.eventBus.publish(new NotificationDispatchedEvent(
      record.getId().getValue(),
      record.getCustomerId().getValue(),
      record.userId,
      record.type.value,
      record.channel.value,
      record.sourceEventId.getValue(),
      record.sourceEntityId?.getValue() ?? null,
    ));
  }
}
