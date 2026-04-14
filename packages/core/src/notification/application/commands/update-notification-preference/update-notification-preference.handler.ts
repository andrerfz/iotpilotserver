import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { EventBus } from '@iotpilot/core/shared/application/bus/event.bus';
import { UpdateNotificationPreferenceCommand } from './update-notification-preference.command';
import { NotificationPreferenceRepository } from '@iotpilot/core/notification/domain/interfaces/notification-preference.repository';
import { NotificationPreferenceEntity } from '@iotpilot/core/notification/domain/entities/notification-preference.entity';
import { NotificationPreferenceId } from '@iotpilot/core/notification/domain/value-objects/notification-preference-id.vo';
import { NotificationPreferenceUpdatedEvent } from '@iotpilot/core/notification/domain/events/notification-preference-updated.event';

export class UpdateNotificationPreferenceHandler implements CommandHandler<UpdateNotificationPreferenceCommand, void> {
  constructor(
    private readonly preferenceRepo: NotificationPreferenceRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: UpdateNotificationPreferenceCommand): Promise<void> {
    const existing = await this.preferenceRepo.findOne(
      command.userId,
      command.channel,
      command.notificationType,
      command.customerId,
    );

    if (existing) {
      existing.update(command.enabled, command.destination);
      await this.preferenceRepo.save(existing);
      await this.eventBus.publish(new NotificationPreferenceUpdatedEvent(
        existing.getId().getValue(),
        command.customerId.getValue(),
        command.userId,
        command.channel.value,
        command.notificationType.value,
        command.enabled,
      ));
      return;
    }

    const preference = NotificationPreferenceEntity.create({
      id: NotificationPreferenceId.generate(),
      customerId: command.customerId,
      userId: command.userId,
      channel: command.channel,
      notificationType: command.notificationType,
      enabled: command.enabled,
      destination: command.destination,
    });

    await this.preferenceRepo.save(preference);
    await this.eventBus.publish(new NotificationPreferenceUpdatedEvent(
      preference.getId().getValue(),
      command.customerId.getValue(),
      command.userId,
      command.channel.value,
      command.notificationType.value,
      command.enabled,
    ));
  }
}
