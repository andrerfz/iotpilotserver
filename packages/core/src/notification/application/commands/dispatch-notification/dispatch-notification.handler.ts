import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';
import { DispatchNotificationCommand } from './dispatch-notification.command';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationRecordEntity } from '@iotpilot/core/notification/domain/entities/notification-record.entity';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { NotificationDispatchedEvent } from '@iotpilot/core/notification/domain/events/notification-dispatched.event';

export class DispatchNotificationHandler implements CommandHandler<DispatchNotificationCommand, string> {
  constructor(
    private readonly recordRepo: NotificationRecordRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: DispatchNotificationCommand): Promise<string> {
    const record = NotificationRecordEntity.create({
      id: NotificationRecordId.generate(),
      customerId: command.customerId,
      userId: command.userId,
      type: command.type,
      channel: command.channel,
      recipient: command.recipient,
      subject: command.subject,
      body: command.body,
      sourceEventId: command.sourceEventId,
      sourceEntityId: command.sourceEntityId,
      maxAttempts: command.maxAttempts,
      scheduledAt: command.scheduledAt,
    });

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

    return record.getId().getValue();
  }
}
