import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { DeviceMetrics } from '../entities/device-metrics.entity';

export class MetricsCollectedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly metrics: DeviceMetrics,
    public readonly hasAlerts: boolean
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName,
    metrics: DeviceMetrics,
    hasAlerts: boolean = false
  ): MetricsCollectedEvent {
    return new MetricsCollectedEvent(
      deviceId,
      deviceName,
      metrics,
      hasAlerts
    );
  }
}