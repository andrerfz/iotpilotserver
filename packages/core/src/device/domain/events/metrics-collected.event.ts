import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {DeviceMetrics} from '../entities/device-metrics.entity';

/**
 * Event emitted when metrics are collected from a device
 */
export class MetricsCollectedEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly metrics: DeviceMetrics,
    public readonly collectionTimestamp: Date,
    public readonly hasAlerts: boolean,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that the metrics were collected from
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that the metrics were collected from
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the metrics that were collected
   */
  getMetrics(): DeviceMetrics {
    return this.metrics;
  }

  /**
   * Gets the timestamp when the metrics were collected
   */
  getCollectionTimestamp(): Date {
    return this.collectionTimestamp;
  }

  /**
   * Indicates whether any alerts were triggered by the collected metrics
   */
  hasTriggeredAlerts(): boolean {
    return this.hasAlerts;
  }

  /**
   * Gets the CPU usage from the collected metrics
   */
  getCpuUsage(): number {
    return this.metrics.cpuUsage;
  }

  /**
   * Gets the memory usage from the collected metrics
   */
  getMemoryUsage(): number {
    return this.metrics.memoryUsage;
  }

  /**
   * Gets the disk usage from the collected metrics
   */
  getDiskUsage(): number {
    return this.metrics.diskUsage;
  }

  /**
   * Gets the temperature from the collected metrics
   */
  getTemperature(): number | undefined {
    return this.metrics.temperature;
  }

  /**
   * Gets the network traffic from the collected metrics (sum of Rx and Tx)
   */
  getNetworkTraffic(): number {
    return (this.metrics.networkRx || 0) + (this.metrics.networkTx || 0);
  }
}