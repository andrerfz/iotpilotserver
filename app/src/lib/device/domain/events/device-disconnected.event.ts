import {TenantScopedEventBase} from '@/lib/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when a device disconnects from the system
 */
export class DeviceDisconnectedEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly disconnectionTimestamp: Date,
    public readonly disconnectionReason: string | null,
    public readonly wasGraceful: boolean,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that disconnected
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that disconnected
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the timestamp when the device disconnected
   */
  getDisconnectionTimestamp(): Date {
    return this.disconnectionTimestamp;
  }

  /**
   * Gets the reason for the disconnection, if available
   */
  getDisconnectionReason(): string | null {
    return this.disconnectionReason;
  }

  /**
   * Indicates whether the disconnection was graceful
   */
  wasDisconnectionGraceful(): boolean {
    return this.wasGraceful;
  }
}