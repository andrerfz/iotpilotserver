import { NotificationRecordRepository, NotificationRecordFilters, PaginatedNotificationRecords } from '../../domain/interfaces/notification-record.repository';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { NotificationRecordId } from '../../domain/value-objects/notification-record-id.vo';
import { NotificationRecordMapper } from '../mappers/notification-record.mapper';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class PrismaNotificationRecordRepository implements NotificationRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: NotificationRecordId, customerId: CustomerId): Promise<NotificationRecordEntity | null> {
    const raw = await this.prisma.getClient().notificationRecord.findFirst({
      where: { id: id.getValue(), customerId: customerId.getValue(), deletedAt: null },
    });
    return raw ? NotificationRecordMapper.toDomain(raw) : null;
  }

  async findPaginated(customerId: CustomerId, filters: NotificationRecordFilters): Promise<PaginatedNotificationRecords> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      customerId: customerId.getValue(),
      deletedAt: null,
    };
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type.value;
    if (filters.channel) where.channel = filters.channel.value;
    if (filters.status) where.status = filters.status.value;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.getClient().notificationRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.getClient().notificationRecord.count({ where }),
    ]);

    return { records: rows.map(NotificationRecordMapper.toDomain), total, page, limit };
  }

  async save(record: NotificationRecordEntity): Promise<void> {
    const data = NotificationRecordMapper.toPersistence(record);
    await this.prisma.getClient().notificationRecord.upsert({
      where: { id: record.getId().getValue() },
      create: data as any,
      update: data as any,
    });
  }
}
