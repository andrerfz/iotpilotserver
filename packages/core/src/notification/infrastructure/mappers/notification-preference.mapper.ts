import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import { NotificationPreferenceId } from '../../domain/value-objects/notification-preference-id.vo';
import { NotificationRecipient } from '../../domain/value-objects/notification-recipient.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export class NotificationPreferenceMapper {
  static toDomain(raw: any): NotificationPreferenceEntity {
    return NotificationPreferenceEntity.reconstitute({
      id: NotificationPreferenceId.create(raw.id),
      customerId: CustomerId.create(raw.customerId),
      userId: raw.userId,
      channel: NotificationChannel.fromString(raw.channel),
      notificationType: NotificationType.fromString(raw.notificationType),
      enabled: raw.enabled,
      destination: raw.destination ? NotificationRecipient.create(raw.destination) : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt ?? null,
    });
  }

  static toPersistence(entity: NotificationPreferenceEntity): Record<string, unknown> {
    return {
      id: entity.getId().getValue(),
      customerId: entity.getCustomerId().getValue(),
      userId: entity.userId,
      channel: entity.channel.value,
      notificationType: entity.notificationType.value,
      enabled: entity.enabled,
      destination: entity.destination?.getValue() ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }
}
