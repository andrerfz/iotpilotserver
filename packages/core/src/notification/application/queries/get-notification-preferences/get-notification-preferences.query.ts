import { TenantAwareQuery } from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationPreferenceEntity } from '@iotpilot/core/notification/domain/entities/notification-preference.entity';

export class GetNotificationPreferencesQuery extends TenantAwareQuery<NotificationPreferenceEntity[]> {
  private constructor(
    tenantContext: TenantContext,
    public readonly userId: string,
    public readonly customerId: CustomerId,
  ) {
    super(tenantContext);
  }

  static create(userId: string, customerId: string, tenantContext: TenantContext): GetNotificationPreferencesQuery {
    return new GetNotificationPreferencesQuery(tenantContext, userId, CustomerId.create(customerId));
  }
}
