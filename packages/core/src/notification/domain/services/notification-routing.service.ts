import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { NotificationPreferenceRepository } from '../interfaces/notification-preference.repository';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

export interface RoutingEntry {
  userId: string;
  channel: string;
  destination: string | null;
}

// ADR-009: types that get a synthetic EMAIL route when no explicit preference exists
const CRITICAL_TYPES = new Set([
  NotificationType.ALERT_TRIGGERED.value,
  NotificationType.DEVICE_OFFLINE.value,
]);

// Maps notification type → coarse-grained user_preferences key (NOTIFICATIONS category)
const COARSE_TOGGLE: Record<string, string> = {
  ALERT_TRIGGERED:  'alertNotifications',
  ALERT_RESOLVED:   'alertNotifications',
  DEVICE_OFFLINE:   'deviceOfflineNotifications',
  DEVICE_ONLINE:    'deviceOfflineNotifications',
  USER_LOGIN_ALERT: 'loginNotifications',
};

export class NotificationRoutingService {
  constructor(
    private readonly preferenceRepo: NotificationPreferenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Original single-user route resolver. Kept for backward compatibility.
   * Suitable when the caller already knows the target userId and email.
   */
  async resolveRoutes(
    type: NotificationType,
    customerId: CustomerId,
    userId: string,
    userEmail: string | null,
  ): Promise<RoutingEntry[]> {
    if (userId === 'system') {
      // Legacy path: fan out to tenant admins instead
      return this.resolveRoutesForTenant(type, customerId);
    }

    // Check coarse-grained toggle first
    const allowed = await this.isNotificationAllowed(userId, type);
    if (!allowed) return [];

    const preferences = await this.preferenceRepo.findByUserAndType(userId, customerId, type);

    if (preferences.length > 0) {
      return preferences
        .filter(p => p.enabled)
        .map((pref: NotificationPreferenceEntity): RoutingEntry => ({
          userId,
          channel: pref.channel.value,
          destination: pref.destination?.getValue() ?? userEmail,
        }));
    }

    // ADR-009 fallback: critical types always reach the user via EMAIL
    if (CRITICAL_TYPES.has(type.value) && userEmail !== null) {
      return [{ userId, channel: 'EMAIL', destination: userEmail }];
    }

    return [];
  }

  /**
   * Fan-out resolver for tenant-level events (no specific target user).
   * Notifies all ADMIN/SUPERADMIN users in the tenant whose coarse-grained
   * notification preferences allow this notification type.
   */
  async resolveRoutesForTenant(
    type: NotificationType,
    customerId: CustomerId,
  ): Promise<RoutingEntry[]> {
    const admins = await this.prisma.getClient().user.findMany({
      where: {
        customerId: customerId.getValue(),
        role: { in: ['ADMIN', 'SUPERADMIN'] },
        deletedAt: null,
      },
      select: { id: true, email: true },
    });

    const routes: RoutingEntry[] = [];

    for (const admin of admins) {
      const allowed = await this.isNotificationAllowed(admin.id, type);
      if (!allowed) continue;

      const channelPrefs = await this.preferenceRepo.findByUserAndType(
        admin.id,
        customerId,
        type,
      );

      if (channelPrefs.length > 0) {
        for (const pref of channelPrefs.filter(p => p.enabled)) {
          routes.push({
            userId: admin.id,
            channel: pref.channel.value,
            destination: pref.destination?.getValue() ?? admin.email,
          });
        }
      } else if (CRITICAL_TYPES.has(type.value)) {
        // ADR-009 fallback: EMAIL if the admin hasn't configured explicit preferences
        routes.push({ userId: admin.id, channel: 'EMAIL', destination: admin.email });
      }
    }

    return routes;
  }

  /**
   * Checks the coarse-grained user_preferences toggle for a specific user.
   * Returns true if the notification is allowed (default: true when no preference set).
   */
  private async isNotificationAllowed(userId: string, type: NotificationType): Promise<boolean> {
    const toggleKey = COARSE_TOGGLE[type.value];
    if (!toggleKey) return true;

    try {
      const pref = await this.prisma.getClient().userPreference.findUnique({
        where: {
          userId_category_key: { userId, category: 'NOTIFICATIONS', key: toggleKey },
        },
        select: { value: true },
      });
      // Default is true — only block if explicitly set to 'false'
      return pref?.value !== 'false';
    } catch {
      return true;
    }
  }
}
