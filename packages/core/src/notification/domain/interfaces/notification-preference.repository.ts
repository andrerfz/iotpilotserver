import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { NotificationPreferenceId } from '../value-objects/notification-preference-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export interface NotificationPreferenceRepository {
  findByUserId(userId: string, customerId: CustomerId): Promise<NotificationPreferenceEntity[]>;
  findByUserAndType(userId: string, customerId: CustomerId, type: NotificationType): Promise<NotificationPreferenceEntity[]>;
  findOne(userId: string, channel: NotificationChannel, type: NotificationType, customerId: CustomerId): Promise<NotificationPreferenceEntity | null>;
  save(preference: NotificationPreferenceEntity): Promise<void>;
}
