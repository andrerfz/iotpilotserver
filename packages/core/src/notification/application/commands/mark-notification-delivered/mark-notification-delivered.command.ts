import { Command } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class MarkNotificationDeliveredCommand implements Command {
  private constructor(
    public readonly notificationRecordId: NotificationRecordId,
    public readonly customerId: CustomerId,
  ) {}

  static create(recordId: string, customerId: string): MarkNotificationDeliveredCommand {
    return new MarkNotificationDeliveredCommand(
      NotificationRecordId.create(recordId),
      CustomerId.create(customerId),
    );
  }
}
