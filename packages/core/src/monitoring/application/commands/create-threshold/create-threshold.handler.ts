import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {CreateThresholdCommand} from './create-threshold.command';
import {Threshold} from '@iotpilot/core/monitoring/domain/entities/threshold.entity';
import {ThresholdRepository} from '@iotpilot/core/monitoring/domain/interfaces/threshold-repository.interface';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {ThresholdCreatedEvent} from '@iotpilot/core/monitoring/domain/events/threshold-created.event';

/**
 * Handler for creating a new threshold
 */
export class CreateThresholdHandler implements CommandHandler<CreateThresholdCommand, Threshold> {
  constructor(
    private readonly thresholdRepository: ThresholdRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the create threshold command
   * 
   * @param command The create threshold command
   * @returns The newly created threshold
   */
  async handle(command: CreateThresholdCommand): Promise<Threshold> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Check for duplicate threshold name within the tenant
    const tenantContext = command.getTenantContext();
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }
    
    const customerId = tenantContext.getCustomerId();
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    
    // Enforce the real invariant: at most one threshold per (deviceId, metricName)
    // within the tenant. The name is only a display label — a global and a
    // per-device threshold for the same metric legitimately share a name, so a
    // name-uniqueness check wrongly blocked that (and multi-device) case.
    const scopeThresholds = command.deviceId
      ? await this.thresholdRepository.findByDeviceId(command.deviceId, customerId)
      : await this.thresholdRepository.findGlobalThresholds(customerId);

    if (scopeThresholds.some(t => t.metricName === command.metricName)) {
      throw new Error(`A threshold for metric '${command.metricName}' already exists in this scope`);
    }

    // Generate a new threshold ID
    const thresholdId = ThresholdId.create();

    // Create the threshold
    const threshold = Threshold.create(
      thresholdId,
      command.deviceId,
      command.name,
      command.description,
      command.metricName,
      command.operator,
      command.value,
      command.unit,
      command.severity,
      command.type,
      command.cooldownMinutes,
      command.metadata,
      command.customerId
    );

    // Save the threshold to the repository
    const savedThreshold = await this.thresholdRepository.save(threshold);

    // Create and publish threshold created event
    const event = new ThresholdCreatedEvent(
      thresholdId,
      command.deviceId,
      command.name,
      command.metricName,
      command.customerId
    );
    
    await this.eventBus.publish(event);

    return savedThreshold;
  }
}