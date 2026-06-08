import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {ResolveAlertCommand} from './resolve-alert.command';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertRepository} from '@iotpilot/core/monitoring/domain/interfaces/alert-repository.interface';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';

/**
 * Handler for resolving an alert
 */
export class ResolveAlertHandler implements CommandHandler<ResolveAlertCommand, Alert> {
  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the resolve alert command
   * 
   * @param command The resolve alert command
   * @returns The resolved alert
   */
  async handle(command: ResolveAlertCommand): Promise<Alert> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Find the alert
    const alert = await this.alertRepository.findById(command.alertId, command.customerId);
    if (!alert) {
      throw new Error(`Alert with ID ${command.alertId.value} not found`);
    }

    // Check if the alert can be resolved
    if (alert.isResolved()) {
      throw new Error(`Alert with ID ${command.alertId.value} is already resolved`);
    }

    // Resolve the alert
    alert.resolve();

    // Save the updated alert
    const updatedAlert = await this.alertRepository.save(alert);

    // Get events from the entity and publish them
    const events = alert.getEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    // Clear events from the entity
    alert.clearEvents();

    return updatedAlert;
  }
}