import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when a threshold is created
 */
export class ThresholdCreatedEvent extends DomainEventBase {
  constructor(
    public readonly thresholdId: ThresholdId,
    public readonly deviceId: DeviceId | null,
    public readonly name: string,
    public readonly metricName: string,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add any additional properties or logic here
    this.eventData = {
      thresholdId: thresholdId.value,
      deviceId: deviceId ? deviceId.value : null,
      name: name,
      metricName: metricName,
      isGlobal: deviceId === null,
      tenantId: tenantId.value,
      timestamp: new Date().toISOString()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}