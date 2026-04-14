import { DomainEventBase } from '@iotpilot/core/shared/domain/events/domain.event';

export class NotificationFailedEvent extends DomainEventBase {
  constructor(
    public readonly notificationRecordId: string,
    public readonly customerId: string,
    public readonly userId: string | null,
    public readonly channel: string,
    public readonly type: string,
    public readonly status: 'FAILED' | 'DEAD',
    public readonly attemptCount: number,
    public readonly maxAttempts: number,
    public readonly errorMessage: string | null,
    public readonly sourceEventId: string,
  ) {
    super();
  }
}
