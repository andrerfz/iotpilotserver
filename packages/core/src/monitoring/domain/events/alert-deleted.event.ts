import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {AlertId} from '../value-objects/alert-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when an alert is deleted
 */
export class AlertDeletedEvent extends DomainEventBase {
  constructor(
    public readonly alertId: AlertId,
    public readonly tenantId: CustomerId,
    public readonly deletedBy: string,
    public readonly deletedAt: Date
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      alertId: alertId.getValue(),
      deletedBy: deletedBy,
      deletedAt: deletedAt.toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}