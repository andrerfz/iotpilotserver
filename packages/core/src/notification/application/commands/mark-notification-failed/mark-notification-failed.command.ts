import { Command } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { NotificationError } from '@iotpilot/core/notification/domain/value-objects/notification-error.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class MarkNotificationFailedCommand implements Command {
  private constructor(
    public readonly notificationRecordId: NotificationRecordId,
    public readonly customerId: CustomerId,
    public readonly errorMessage: NotificationError,
  ) {}

  static create(recordId: string, customerId: string, errorMessage: string): MarkNotificationFailedCommand {
    return new MarkNotificationFailedCommand(
      NotificationRecordId.create(recordId),
      CustomerId.create(customerId),
      NotificationError.create(errorMessage),
    );
  }
}
