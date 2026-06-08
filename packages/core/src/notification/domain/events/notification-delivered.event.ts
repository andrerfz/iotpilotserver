import { DomainEventBase } from '@iotpilot/core/shared/domain/events/domain.event';

export class NotificationDeliveredEvent extends DomainEventBase {
  constructor(
    public readonly notificationRecordId: string,
    public readonly customerId: string,
    public readonly userId: string | null,
    public readonly channel: string,
    public readonly type: string,
    public readonly sourceEventId: string,
  ) {
    super();
  }
}
