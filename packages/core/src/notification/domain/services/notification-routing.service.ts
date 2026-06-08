import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { NotificationPreferenceRepository } from '../interfaces/notification-preference.repository';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';

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

export class NotificationRoutingService {
  constructor(
    private readonly preferenceRepo: NotificationPreferenceRepository,
  ) {}

  async resolveRoutes(
    type: NotificationType,
    customerId: CustomerId,
    userId: string,
    userEmail: string | null,
  ): Promise<RoutingEntry[]> {
    const preferences = await this.preferenceRepo.findByUserAndType(userId, customerId, type);

    // If the user has any explicit preference (enabled or disabled), respect it — no fallback.
    if (preferences.length > 0) {
      return preferences
        .filter(p => p.enabled)
        .map((pref: NotificationPreferenceEntity): RoutingEntry => ({
          userId,
          channel: pref.channel.value,
          destination: pref.destination?.getValue() ?? userEmail,
        }));
    }

    // ADR-009 fallback: critical types always reach the user via EMAIL when no preference exists
    if (CRITICAL_TYPES.has(type.value) && userEmail !== null) {
      return [{ userId, channel: 'EMAIL', destination: userEmail }];
    }

    return [];
  }
}
