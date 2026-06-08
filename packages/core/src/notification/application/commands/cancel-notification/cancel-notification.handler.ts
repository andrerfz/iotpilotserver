import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { CancelNotificationCommand } from './cancel-notification.command';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationNotFoundException } from '@iotpilot/core/notification/domain/exceptions/notification-not-found.exception';

export class CancelNotificationHandler implements CommandHandler<CancelNotificationCommand, void> {
  constructor(private readonly recordRepo: NotificationRecordRepository) {}

  async handle(command: CancelNotificationCommand): Promise<void> {
    const record = await this.recordRepo.findById(command.notificationRecordId, command.customerId);
    if (!record) throw new NotificationNotFoundException(command.notificationRecordId.getValue());

    record.cancel();
    await this.recordRepo.save(record);
  }
}
