import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface StatusChangeRecord {
  deviceId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
  reason?: string;
}

export interface StatusAlert {
  deviceId: string;
  alertType: string;
  message: string;
  severity: string;
  timestamp: Date;
}

/**
 * Repository interface for device status monitoring data
 */
export interface DeviceStatusMonitorRepository {
  /**
   * Record a status change for a device
   */
  recordStatusChange(
    deviceId: DeviceId,
    previousStatus: string,
    newStatus: string,
    tenantContext?: TenantContext
  ): Promise<void>;

  /**
   * Update the last monitored timestamp for a device
   */
  updateLastMonitored(
    deviceId: DeviceId,
    timestamp: number,
    tenantContext?: TenantContext
  ): Promise<void>;

  /**
   * Create a status alert for a device
   */
  createStatusAlert(
    deviceId: DeviceId,
    alertType: string,
    message: string,
    severity: string,
    tenantContext?: TenantContext
  ): Promise<void>;

  /**
   * Get recent status changes for a device
   */
  getRecentStatusChanges(
    deviceId: DeviceId,
    limit?: number,
    tenantContext?: TenantContext
  ): Promise<StatusChangeRecord[]>;

  /**
   * Stop monitoring a device
   */
  stopMonitoring(
    deviceId: DeviceId,
    tenantContext?: TenantContext
  ): Promise<void>;

  /**
   * Record an emergency update for a device
   */
  recordEmergencyUpdate(
    deviceId: DeviceId,
    updateType: string,
    details: Record<string, unknown>,
    tenantContext?: TenantContext
  ): Promise<void>;
}
