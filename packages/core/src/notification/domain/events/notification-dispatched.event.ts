import { DomainEventBase } from '@iotpilot/core/shared/domain/events/domain.event';

export class NotificationDispatchedEvent extends DomainEventBase {
  constructor(
    public readonly notificationRecordId: string,
    public readonly customerId: string,
    public readonly userId: string | null,
    public readonly type: string,
    public readonly channel: string,
    public readonly sourceEventId: string,
    public readonly sourceEntityId: string | null,
  ) {
    super();
  }
}
