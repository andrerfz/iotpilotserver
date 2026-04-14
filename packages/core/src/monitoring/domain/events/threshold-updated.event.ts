import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when a threshold is updated
 */
export class ThresholdUpdatedEvent extends DomainEventBase {
  constructor(
    public readonly thresholdId: ThresholdId,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      thresholdId: thresholdId.getValue(),
      timestamp: new Date().toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}