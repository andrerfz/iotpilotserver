import { TenantAwareQuery } from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { NotificationRecordEntity } from '@iotpilot/core/notification/domain/entities/notification-record.entity';

export class GetNotificationRecordQuery extends TenantAwareQuery<NotificationRecordEntity | null> {
  private constructor(
    tenantContext: TenantContext,
    public readonly notificationRecordId: NotificationRecordId,
    public readonly customerId: CustomerId,
  ) {
    super(tenantContext);
  }

  static create(recordId: string, customerId: string, tenantContext: TenantContext): GetNotificationRecordQuery {
    return new GetNotificationRecordQuery(
      tenantContext,
      NotificationRecordId.create(recordId),
      CustomerId.create(customerId),
    );
  }
}
