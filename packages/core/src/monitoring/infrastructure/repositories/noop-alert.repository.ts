import {AlertRepository} from '@iotpilot/core/monitoring/domain/interfaces/alert-repository.interface';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {AlertStatus} from '@iotpilot/core/monitoring/domain/value-objects/alert-status.vo';
import {TimeRange} from '@iotpilot/core/monitoring/domain/value-objects/time-range.vo';

/**
 * No-op alert repository for environments where alert persistence isn't wired yet.
 */
export class NoopAlertRepository implements AlertRepository {
  async save(alert: Alert): Promise<Alert> {
    return alert;
  }

  async findById(_id: AlertId, _tenantId: CustomerId): Promise<Alert | null> {
    return null;
  }

  async findByDeviceId(_deviceId: DeviceId, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Alert[]> {
    return [];
  }

  async findByThresholdId(_thresholdId: ThresholdId, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Alert[]> {
    return [];
  }

  async findBySeverity(_severity: AlertSeverity, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Alert[]> {
    return [];
  }

  async findByStatus(_status: AlertStatus, _tenantId: CustomerId, _timeRange?: TimeRange): Promise<Alert[]> {
    return [];
  }

  async findAll(_tenantId: CustomerId, _timeRange?: TimeRange, _limit?: number, _offset?: number): Promise<Alert[]> {
    return [];
  }

  async count(_tenantId: CustomerId, _timeRange?: TimeRange): Promise<number> {
    return 0;
  }

  async delete(_id: AlertId, _tenantId: CustomerId): Promise<void> {
    return;
  }
}


