import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {MetricId} from '../value-objects/metric-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {MetricValue} from '../value-objects/metric-value.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Event raised when a metric is recorded
 */
export class MetricRecordedEvent extends DomainEventBase {
  constructor(
    public readonly metricId: MetricId,
    public readonly deviceId: DeviceId,
    public readonly metricName: string,
    public readonly value: MetricValue,
    public readonly timestamp: Date,
    public readonly tenantId: CustomerId
  ) {
    super();
    
    // Add event data as a property
    this.eventData = {
      metricId: metricId.getValue(),
      deviceId: deviceId.getValue(),
      metricName: metricName,
      value: value.getValue(),
      unit: value.getUnit(),
      timestamp: timestamp.toISOString(),
      tenantId: tenantId.getValue()
    };
  }
  
  // Custom property to store event data
  public readonly eventData: Record<string, any>;
}