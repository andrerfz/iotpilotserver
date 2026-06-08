import { QueryHandler } from '@iotpilot/core/shared/application/interfaces/query.interface';
import { GetNotificationHistoryQuery } from './get-notification-history.query';
import { NotificationRecordRepository, PaginatedNotificationRecords, NotificationRecordFilters } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationDeliveryStatus } from '@iotpilot/core/notification/domain/value-objects/notification-delivery-status.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export class GetNotificationHistoryHandler implements QueryHandler<GetNotificationHistoryQuery, PaginatedNotificationRecords> {
  constructor(private readonly recordRepo: NotificationRecordRepository) {}

  async handle(query: GetNotificationHistoryQuery): Promise<PaginatedNotificationRecords> {
    const { filters } = query;
    const repoFilters: NotificationRecordFilters = {
      userId: filters.userId,
      type: filters.type ? NotificationType.fromString(filters.type) : undefined,
      channel: filters.channel ? NotificationChannel.fromString(filters.channel) : undefined,
      status: filters.status ? NotificationDeliveryStatus.create(filters.status) : undefined,
      from: filters.from,
      to: filters.to,
      page: filters.page,
      limit: filters.limit,
    };
    return this.recordRepo.findPaginated(query.customerId, repoFilters);
  }
}
