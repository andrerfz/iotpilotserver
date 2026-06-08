import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {AlertId} from '../value-objects/alert-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when an alert is triggered
 */
export class AlertTriggeredEvent extends DomainEventBase {
  constructor(
    public readonly alertId: AlertId,
    public readonly deviceId: DeviceId,
    public readonly thresholdId: ThresholdId,
    public readonly severity: AlertSeverity,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add any additional properties or logic here
    this.eventData = {
      alertId: alertId.value,
      deviceId: deviceId.value,
      thresholdId: thresholdId.value,
      severity: severity.value,
      tenantId: tenantId.value,
      timestamp: new Date().toISOString()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}