import { TenantAwareCommand } from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { NotificationRecipient } from '@iotpilot/core/notification/domain/value-objects/notification-recipient.vo';
import { NotificationSubject } from '@iotpilot/core/notification/domain/value-objects/notification-subject.vo';
import { NotificationBody } from '@iotpilot/core/notification/domain/value-objects/notification-body.vo';
import { NotificationMaxAttempts } from '@iotpilot/core/notification/domain/value-objects/notification-max-attempts.vo';
import { SourceEventId } from '@iotpilot/core/notification/domain/value-objects/source-event-id.vo';
import { SourceEntityId } from '@iotpilot/core/notification/domain/value-objects/source-entity-id.vo';

export class DispatchNotificationCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId,
    public readonly userId: string | null,
    public readonly type: NotificationType,
    public readonly channel: NotificationChannel,
    public readonly recipient: NotificationRecipient,
    public readonly subject: NotificationSubject,
    public readonly body: NotificationBody,
    public readonly sourceEventId: SourceEventId,
    public readonly sourceEntityId: SourceEntityId | null,
    public readonly maxAttempts: NotificationMaxAttempts,
    public readonly scheduledAt: Date | null,
  ) {
    super(tenantContext);
  }

  static create(params: {
    customerId: string;
    userId: string | null;
    type: string;
    channel: string;
    recipient: string;
    subject: string;
    body: string;
    sourceEventId: string;
    sourceEntityId?: string | null;
    maxAttempts?: number;
    scheduledAt?: Date | null;
    tenantContext: TenantContext;
  }): DispatchNotificationCommand {
    const customerId = CustomerId.create(params.customerId);
    return new DispatchNotificationCommand(
      params.tenantContext,
      customerId,
      params.userId,
      NotificationType.fromString(params.type),
      NotificationChannel.fromString(params.channel),
      NotificationRecipient.create(params.recipient),
      NotificationSubject.create(params.subject),
      NotificationBody.create(params.body),
      SourceEventId.create(params.sourceEventId),
      params.sourceEntityId ? SourceEntityId.create(params.sourceEntityId) : null,
      params.maxAttempts ? NotificationMaxAttempts.create(params.maxAttempts) : NotificationMaxAttempts.default(),
      params.scheduledAt ?? null,
    );
  }
}
