import { TenantAwareQuery } from '@iotpilot/core/shared/application/queries/tenant-aware-query';
import { TenantContext } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { PaginatedNotificationRecords } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';

export interface NotificationHistoryFilters {
  userId?: string;
  type?: string;
  channel?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export class GetNotificationHistoryQuery extends TenantAwareQuery<PaginatedNotificationRecords> {
  private constructor(
    tenantContext: TenantContext,
    public readonly customerId: CustomerId,
    public readonly filters: NotificationHistoryFilters,
  ) {
    super(tenantContext);
  }

  static create(customerId: string, filters: NotificationHistoryFilters, tenantContext: TenantContext): GetNotificationHistoryQuery {
    return new GetNotificationHistoryQuery(tenantContext, CustomerId.create(customerId), filters);
  }
}
