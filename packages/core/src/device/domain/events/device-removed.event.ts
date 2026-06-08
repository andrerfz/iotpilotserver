import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when a device is removed from the system
 */
export class DeviceRemovedEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly removedBy: string,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that was removed
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that was removed
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the identifier of the user or process that removed the device
   */
  getRemovedBy(): string {
    return this.removedBy;
  }
}