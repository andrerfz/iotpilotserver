import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {CreateAlertCommand} from './create-alert.command';
import {Alert} from '@/lib/monitoring/domain/entities/alert.entity';
import {AlertCreator} from '@/lib/monitoring/domain/services/alert-creator.service';
import {AlertRepository} from '@/lib/monitoring/domain/interfaces/alert-repository.interface';
import {AlertId} from '@/lib/monitoring/domain/value-objects/alert-id.vo';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {AlertTriggeredEvent} from '@/lib/monitoring/domain/events/alert-triggered.event';
import {AlertStatus} from '@/lib/monitoring/domain/value-objects/alert-status.vo';
import {MetricValue} from '@/lib/monitoring/domain/value-objects/metric-value.vo';

/**
 * Handler for creating a new alert
 */
export class CreateAlertHandler implements CommandHandler<CreateAlertCommand, Alert> {
  constructor(
    private readonly alertCreator: AlertCreator,
    private readonly alertRepository: AlertRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the create alert command
   * 
   * @param command The create alert command
   * @returns The newly created alert
   */
  async handle(command: CreateAlertCommand): Promise<Alert> {
    // Validate tenant context
    if (!command.getTenantContext()) {
      throw new Error('Tenant context is required');
    }

    // Generate a new alert ID
    const alertId = AlertId.create();

    // Extract metric information from metadata if available
    const metricName = command.metadata?.metricName || 'system';
    const metricValue = command.metadata?.metricValue || 0;
    const metricUnit = command.metadata?.metricUnit || '';
    const thresholdValue = command.metadata?.thresholdValue || 0;
    
    // Create the alert with the new signature
    const alert = Alert.create(
      alertId,
      command.title,
      command.message,
      command.severity,
      AlertStatus.create('ACTIVE'), // New alerts are always active
      command.deviceId,
      command.customerId,
      metricName,
      MetricValue.create(metricValue, metricUnit),
      thresholdValue,
      command.thresholdId,
      new Date(), // Current timestamp (createdAt)
      undefined, // acknowledgedAt
      undefined, // acknowledgedBy
      undefined, // resolvedAt
      undefined, // resolvedBy
      command.metadata?.notes,
      undefined, // type
      command.metadata // metadata
    );

    // Save the alert to the repository
    const savedAlert = await this.alertRepository.save(alert);

    // Publish alert triggered event
    const event = new AlertTriggeredEvent(
      alertId,
      command.deviceId,
      command.thresholdId,
      command.severity,
      command.customerId
    );
    
    await this.eventBus.publish(event);

    return savedAlert;
  }
}