import { NotificationTargetRepository } from '../../domain/interfaces/notification-target.repository';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

export class PrismaNotificationTargetRepository implements NotificationTargetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAdminUsersInTenant(
    customerId: CustomerId,
  ): Promise<Array<{ id: string; email: string }>> {
    return this.prisma.getClient().user.findMany({
      where: {
        customerId: customerId.getValue(),
        role: { in: ['ADMIN', 'SUPERADMIN'] },
        deletedAt: null,
      },
      select: { id: true, email: true },
    });
  }

  async getUserNotificationToggle(userId: string, toggleKey: string): Promise<string | null> {
    try {
      const pref = await this.prisma.getClient().userPreference.findUnique({
        where: {
          userId_category_key: { userId, category: 'NOTIFICATIONS', key: toggleKey },
        },
        select: { value: true },
      });
      return pref?.value ?? null;
    } catch {
      return null;
    }
  }
}
