import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {UpdateThresholdCommand} from './update-threshold.command';
import {Threshold} from '@iotpilot/core/monitoring/domain/entities/threshold.entity';
import {ThresholdRepository} from '@iotpilot/core/monitoring/domain/interfaces/threshold-repository.interface';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';

/**
 * Handler for updating an existing threshold
 */
export class UpdateThresholdHandler implements CommandHandler<UpdateThresholdCommand, Threshold> {
  constructor(
    private readonly thresholdRepository: ThresholdRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the update threshold command
   * 
   * @param command The update threshold command
   * @returns The updated threshold
   */
  async handle(command: UpdateThresholdCommand): Promise<Threshold> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Find the threshold
    const threshold = await this.thresholdRepository.findById(command.thresholdId, command.customerId);
    if (!threshold) {
      throw new Error(`Threshold with ID ${command.thresholdId.value} not found`);
    }

    // Update the threshold
    threshold.update(
      command.name,
      command.description,
      command.metricName,
      command.operator,
      command.value,
      command.unit,
      command.severity,
      command.type,
      command.cooldownMinutes
    );

    // Enable or disable the threshold
    if (command.enabled && !threshold.isEnabled()) {
      threshold.enable();
    } else if (!command.enabled && threshold.isEnabled()) {
      threshold.disable();
    }

    // Save the updated threshold
    const updatedThreshold = await this.thresholdRepository.save(threshold);

    // Get events from the entity and publish them
    const events = threshold.getEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    // Clear events from the entity
    threshold.clearEvents();

    return updatedThreshold;
  }
}