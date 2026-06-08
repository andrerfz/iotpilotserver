import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';
import { MarkNotificationDeliveredCommand } from './mark-notification-delivered.command';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationNotFoundException } from '@iotpilot/core/notification/domain/exceptions/notification-not-found.exception';
import { NotificationDeliveredEvent } from '@iotpilot/core/notification/domain/events/notification-delivered.event';

export class MarkNotificationDeliveredHandler implements CommandHandler<MarkNotificationDeliveredCommand, void> {
  constructor(
    private readonly recordRepo: NotificationRecordRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: MarkNotificationDeliveredCommand): Promise<void> {
    const record = await this.recordRepo.findById(command.notificationRecordId, command.customerId);
    if (!record) throw new NotificationNotFoundException(command.notificationRecordId.getValue());

    record.markAsDelivered();
    await this.recordRepo.save(record);

    await this.eventBus.publish(new NotificationDeliveredEvent(
      record.getId().getValue(),
      record.getCustomerId().getValue(),
      record.userId,
      record.channel.value,
      record.type.value,
      record.sourceEventId.getValue(),
    ));
  }
}
