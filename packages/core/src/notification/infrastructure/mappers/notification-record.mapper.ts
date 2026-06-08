import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { NotificationRecordId } from '../../domain/value-objects/notification-record-id.vo';
import { NotificationDeliveryStatus } from '../../domain/value-objects/notification-delivery-status.vo';
import { NotificationRecipient } from '../../domain/value-objects/notification-recipient.vo';
import { NotificationSubject } from '../../domain/value-objects/notification-subject.vo';
import { NotificationBody } from '../../domain/value-objects/notification-body.vo';
import { NotificationAttemptCount } from '../../domain/value-objects/notification-attempt-count.vo';
import { NotificationMaxAttempts } from '../../domain/value-objects/notification-max-attempts.vo';
import { NotificationError } from '../../domain/value-objects/notification-error.vo';
import { SourceEventId } from '../../domain/value-objects/source-event-id.vo';
import { SourceEntityId } from '../../domain/value-objects/source-entity-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export class NotificationRecordMapper {
  static toDomain(raw: any): NotificationRecordEntity {
    return NotificationRecordEntity.reconstitute({
      id: NotificationRecordId.create(raw.id),
      customerId: CustomerId.create(raw.customerId),
      userId: raw.userId ?? null,
      type: NotificationType.fromString(raw.type),
      channel: NotificationChannel.fromString(raw.channel),
      recipient: NotificationRecipient.create(raw.recipient),
      subject: NotificationSubject.create(raw.subject),
      body: NotificationBody.create(raw.body),
      status: NotificationDeliveryStatus.create(raw.status),
      attemptCount: NotificationAttemptCount.create(raw.attemptCount),
      maxAttempts: NotificationMaxAttempts.create(raw.maxAttempts),
      sourceEventId: SourceEventId.create(raw.sourceEventId),
      sourceEntityId: raw.sourceEntityId ? SourceEntityId.create(raw.sourceEntityId) : null,
      errorMessage: raw.errorMessage ? NotificationError.create(raw.errorMessage) : null,
      scheduledAt: raw.scheduledAt ?? null,
      sentAt: raw.sentAt ?? null,
      deliveredAt: raw.deliveredAt ?? null,
      failedAt: raw.failedAt ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt ?? null,
    });
  }

  static toPersistence(entity: NotificationRecordEntity): Record<string, unknown> {
    return {
      id: entity.getId().getValue(),
      customerId: entity.getCustomerId().getValue(),
      userId: entity.userId,
      type: entity.type.value,
      channel: entity.channel.value,
      recipient: entity.recipient.getValue(),
      subject: entity.subject.getValue(),
      body: entity.body.getValue(),
      status: entity.status.value,
      attemptCount: entity.attemptCount.getValue(),
      maxAttempts: entity.maxAttempts.getValue(),
      sourceEventId: entity.sourceEventId.getValue(),
      sourceEntityId: entity.sourceEntityId?.getValue() ?? null,
      errorMessage: entity.errorMessage?.getValue() ?? null,
      scheduledAt: entity.scheduledAt,
      sentAt: entity.sentAt,
      deliveredAt: entity.deliveredAt,
      failedAt: entity.failedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }
}
