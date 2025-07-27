import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {AlertId} from '../value-objects/alert-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when an alert is resolved
 */
export class AlertResolvedEvent extends DomainEventBase {
  constructor(
    public readonly alertId: AlertId,
    public readonly deviceId: DeviceId,
    public readonly thresholdId: ThresholdId,
    public readonly resolvedBy: string,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      alertId: alertId.getValue(),
      deviceId: deviceId.getValue(),
      thresholdId: thresholdId.getValue(),
      resolvedBy: resolvedBy,
      resolvedAt: new Date().toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}