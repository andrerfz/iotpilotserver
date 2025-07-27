import {TenantScopedEventBase} from '@/lib/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';

/**
 * Event emitted when a device connects to the system
 */
export class DeviceConnectedEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly connectionTimestamp: Date,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that connected
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that connected
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the IP address of the device that connected
   */
  getIpAddress(): IpAddress {
    return this.ipAddress;
  }

  /**
   * Gets the timestamp when the device connected
   */
  getConnectionTimestamp(): Date {
    return this.connectionTimestamp;
  }
}