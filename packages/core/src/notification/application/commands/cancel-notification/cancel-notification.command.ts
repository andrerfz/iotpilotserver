import { TenantAwareCommand } from '@iotpilot/core/shared/application/commands/tenant-aware-command';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';

export class CancelNotificationCommand extends TenantAwareCommand {
  private constructor(
    tenantContext: TenantContext,
    public readonly notificationRecordId: NotificationRecordId,
    public readonly customerId: CustomerId,
  ) {
    super(tenantContext);
    this.validateTenantAccess(customerId);
  }

  static create(recordId: string, customerId: string, tenantContext: TenantContext): CancelNotificationCommand {
    return new CancelNotificationCommand(
      tenantContext,
      NotificationRecordId.create(recordId),
      CustomerId.create(customerId),
    );
  }
}
