import { TenantAwareCommand } from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { NotificationRecipient } from '@iotpilot/core/notification/domain/value-objects/notification-recipient.vo';

export class UpdateNotificationPreferenceCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly userId: string,
    public readonly customerId: CustomerId,
    public readonly channel: NotificationChannel,
    public readonly notificationType: NotificationType,
    public readonly enabled: boolean,
    public readonly destination: NotificationRecipient | null,
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  static create(params: {
    userId: string;
    customerId: string;
    channel: string;
    notificationType: string;
    enabled: boolean;
    destination?: string | null;
    tenantContext: TenantContext;
  }): UpdateNotificationPreferenceCommand {
    return new UpdateNotificationPreferenceCommand(
      params.tenantContext,
      params.userId,
      CustomerId.create(params.customerId),
      NotificationChannel.fromString(params.channel),
      NotificationType.fromString(params.notificationType),
      params.enabled,
      params.destination ? NotificationRecipient.create(params.destination) : null,
    );
  }
}
