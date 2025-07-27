import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {DeleteAlertCommand} from './delete-alert.command';
import {AlertRepository} from '@/lib/monitoring/domain/interfaces/alert-repository.interface';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {AlertDeletedEvent} from '@/lib/monitoring/domain/events/alert-deleted.event';

/**
 * Handler for deleting an alert
 */
export class DeleteAlertHandler implements CommandHandler<DeleteAlertCommand, void> {
  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the delete alert command
   * 
   * @param command The delete alert command
   */
  async handle(command: DeleteAlertCommand): Promise<void> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Find the alert
    const alert = await this.alertRepository.findById(command.alertId, command.customerId);
    if (!alert) {
      throw new Error(`Alert with ID ${command.alertId.value} not found`);
    }

    // Delete the alert
    await this.alertRepository.delete(command.alertId, command.customerId);

    // Create and publish AlertDeleted event
    const event = new AlertDeletedEvent(
      command.alertId,
      command.customerId,
      command.userId,
      new Date()
    );
    
    await this.eventBus.publish(event);
  }
}