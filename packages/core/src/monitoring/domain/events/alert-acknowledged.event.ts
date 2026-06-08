import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {AlertId} from '../value-objects/alert-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when an alert is acknowledged
 */
export class AlertAcknowledgedEvent extends DomainEventBase {
  constructor(
    public readonly alertId: AlertId,
    public readonly deviceId: DeviceId,
    public readonly thresholdId: ThresholdId,
    public readonly acknowledgedBy: string,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      alertId: alertId.getValue(),
      deviceId: deviceId.getValue(),
      thresholdId: thresholdId.getValue(),
      acknowledgedBy: acknowledgedBy,
      acknowledgedAt: new Date().toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}