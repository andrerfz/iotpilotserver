import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {MetricId} from '../value-objects/metric-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {MetricValue} from '../value-objects/metric-value.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when a threshold is breached by a metric
 */
export class ThresholdBreachedEvent extends DomainEventBase {
  constructor(
    public readonly thresholdId: ThresholdId,
    public readonly metricId: MetricId,
    public readonly deviceId: DeviceId,
    public readonly metricValue: MetricValue,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      thresholdId: thresholdId.getValue(),
      metricId: metricId.getValue(),
      deviceId: deviceId.getValue(),
      metricValue: metricValue.getValue(),
      metricUnit: metricValue.getUnit(),
      timestamp: new Date().toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}