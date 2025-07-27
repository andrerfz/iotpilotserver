import {DeviceMetrics} from '../entities/device-metrics.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';

export interface MetricsRepository {
  save(metrics: DeviceMetrics, tenantContext?: TenantContext): Promise<void>;
  saveMany(metrics: DeviceMetrics[], tenantContext?: TenantContext): Promise<void>;
  findByDeviceId(deviceId: DeviceId, tenantContext?: TenantContext): Promise<DeviceMetrics[]>;
  findLatestByDeviceId(deviceId: DeviceId, tenantContext?: TenantContext): Promise<DeviceMetrics | null>;
  findByTimeRange(
    deviceId: DeviceId,
    startTime: Date,
    endTime: Date,
    tenantContext?: TenantContext
  ): Promise<DeviceMetrics[]>;
  deleteOldMetrics(olderThan: Date, tenantContext?: TenantContext): Promise<void>;
}
