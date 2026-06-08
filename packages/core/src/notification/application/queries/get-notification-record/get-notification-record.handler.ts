import { QueryHandler } from '@iotpilot/core/shared/application/interfaces/query.interface';
import { GetNotificationRecordQuery } from './get-notification-record.query';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationRecordEntity } from '@iotpilot/core/notification/domain/entities/notification-record.entity';
import { NotificationNotFoundException } from '@iotpilot/core/notification/domain/exceptions/notification-not-found.exception';

export class GetNotificationRecordHandler implements QueryHandler<GetNotificationRecordQuery, NotificationRecordEntity> {
  constructor(private readonly recordRepo: NotificationRecordRepository) {}

  async handle(query: GetNotificationRecordQuery): Promise<NotificationRecordEntity> {
    const record = await this.recordRepo.findById(query.notificationRecordId, query.customerId);
    if (!record) throw new NotificationNotFoundException(query.notificationRecordId.getValue());
    return record;
  }
}
