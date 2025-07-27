import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {AcknowledgeAlertCommand} from './acknowledge-alert.command';
import {Alert} from '@/lib/monitoring/domain/entities/alert.entity';
import {AlertRepository} from '@/lib/monitoring/domain/interfaces/alert-repository.interface';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

/**
 * Handler for acknowledging an alert
 */
export class AcknowledgeAlertHandler implements CommandHandler<AcknowledgeAlertCommand, Alert> {
  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the acknowledge alert command
   * 
   * @param command The acknowledge alert command
   * @returns The acknowledged alert
   */
  async handle(command: AcknowledgeAlertCommand): Promise<Alert> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Find the alert
    const alertEntity = await this.alertRepository.findById(command.alertId, command.customerId);
    if (!alertEntity) {
      throw new Error(`Alert with ID ${command.alertId.value} not found`);
    }

    // Check if the alert can be acknowledged
    if (!alertEntity.isActive()) {
      throw new Error(`Alert with ID ${command.alertId.value} cannot be acknowledged because it is not active`);
    }

    // Acknowledge the alert
    const userId = typeof command.userId === 'string' ? UserId.create(command.userId) : command.userId;
    alertEntity.acknowledge(userId);

    // Save the updated alert
    const updatedAlert = await this.alertRepository.save(alertEntity);

    // Get events from the entity and publish them
    const events = alertEntity.getEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    // Clear events from the entity
    alertEntity.clearEvents();

    return updatedAlert;
  }
}