import {MetricsRepository} from '@iotpilot/core/monitoring/domain/interfaces/metrics-repository.interface';
import {Metric} from '@iotpilot/core/monitoring/domain/entities/metric.entity';
import {MetricId} from '@iotpilot/core/monitoring/domain/value-objects/metric-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '@iotpilot/core/monitoring/domain/value-objects/time-range.vo';

/**
 * No-op implementation used when monitoring storage isn't wired yet.
 * Keeps the container clean (no inline stubs) while allowing the app to boot.
 */
export class NoopMonitoringMetricsRepository implements MetricsRepository {
  async save(_metric: Metric): Promise<void> {
    return;
  }

  async saveMany(_metrics: Metric[]): Promise<void> {
    return;
  }

  async findById(_id: MetricId, _tenantId: CustomerId): Promise<Metric | null> {
    return null;
  }

  async findByDeviceId(_deviceId: DeviceId, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Metric[]> {
    return [];
  }

  async findByName(_name: string, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Metric[]> {
    return [];
  }

  async findByDeviceIdAndName(
    _deviceId: DeviceId,
    _name: string,
    _tenantId: CustomerId,
    _timeRange?: TimeRange
  ): Promise<Metric[]> {
    return [];
  }

  async findByTag(
    _tagKey: string,
    _tagValue: string,
    _tenantId: CustomerId,
    _timeRange?: TimeRange
  ): Promise<Metric[]> {
    return [];
  }

  async findAll(_tenantId: CustomerId, _timeRange?: TimeRange, _limit?: number): Promise<Metric[]> {
    return [];
  }
}


