import { DomainEventBase } from '@iotpilot/core/shared/domain/events/domain.event';

export class NotificationPreferenceUpdatedEvent extends DomainEventBase {
  constructor(
    public readonly notificationPreferenceId: string,
    public readonly customerId: string,
    public readonly userId: string,
    public readonly channel: string,
    public readonly notificationType: string,
    public readonly enabled: boolean,
  ) {
    super();
  }
}
