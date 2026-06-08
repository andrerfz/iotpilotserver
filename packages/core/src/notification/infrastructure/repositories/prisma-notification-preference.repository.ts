import { NotificationPreferenceRepository } from '../../domain/interfaces/notification-preference.repository';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import { NotificationPreferenceMapper } from '../mappers/notification-preference.mapper';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string, customerId: CustomerId): Promise<NotificationPreferenceEntity[]> {
    const rows = await this.prisma.getClient().notificationPreference.findMany({
      where: { userId, customerId: customerId.getValue(), deletedAt: null },
    });
    return rows.map(NotificationPreferenceMapper.toDomain);
  }

  async findByUserAndType(userId: string, customerId: CustomerId, type: NotificationType): Promise<NotificationPreferenceEntity[]> {
    const rows = await this.prisma.getClient().notificationPreference.findMany({
      where: { userId, customerId: customerId.getValue(), notificationType: type.value as any, deletedAt: null },
    });
    return rows.map(NotificationPreferenceMapper.toDomain);
  }

  async findOne(userId: string, channel: NotificationChannel, type: NotificationType, customerId: CustomerId): Promise<NotificationPreferenceEntity | null> {
    const raw = await this.prisma.getClient().notificationPreference.findFirst({
      where: {
        userId,
        customerId: customerId.getValue(),
        channel: channel.value as any,
        notificationType: type.value as any,
        deletedAt: null,
      },
    });
    return raw ? NotificationPreferenceMapper.toDomain(raw) : null;
  }

  async save(preference: NotificationPreferenceEntity): Promise<void> {
    const data = NotificationPreferenceMapper.toPersistence(preference);
    await this.prisma.getClient().notificationPreference.upsert({
      where: { id: preference.getId().getValue() },
      create: data as any,
      update: data as any,
    });
  }
}
