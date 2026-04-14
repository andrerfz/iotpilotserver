import { NotificationRecordEntity } from '../entities/notification-record.entity';
import { NotificationRecordId } from '../value-objects/notification-record-id.vo';
import { NotificationDeliveryStatus } from '../value-objects/notification-delivery-status.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export interface NotificationRecordFilters {
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationDeliveryStatus;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedNotificationRecords {
  records: NotificationRecordEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationRecordRepository {
  findById(id: NotificationRecordId, customerId: CustomerId): Promise<NotificationRecordEntity | null>;
  findPaginated(customerId: CustomerId, filters: NotificationRecordFilters): Promise<PaginatedNotificationRecords>;
  save(record: NotificationRecordEntity): Promise<void>;
}
