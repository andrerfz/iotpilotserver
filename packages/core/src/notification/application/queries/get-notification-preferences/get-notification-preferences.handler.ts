import { QueryHandler } from '@iotpilot/core/shared/application/interfaces/query.interface';
import { GetNotificationPreferencesQuery } from './get-notification-preferences.query';
import { NotificationPreferenceRepository } from '@iotpilot/core/notification/domain/interfaces/notification-preference.repository';
import { NotificationPreferenceEntity } from '@iotpilot/core/notification/domain/entities/notification-preference.entity';

export class GetNotificationPreferencesHandler implements QueryHandler<GetNotificationPreferencesQuery, NotificationPreferenceEntity[]> {
  constructor(private readonly preferenceRepo: NotificationPreferenceRepository) {}

  async handle(query: GetNotificationPreferencesQuery): Promise<NotificationPreferenceEntity[]> {
    return this.preferenceRepo.findByUserId(query.userId, query.customerId);
  }
}
