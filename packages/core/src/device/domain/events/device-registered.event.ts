import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';
import {DeviceStatus} from '../value-objects/device-status.vo';

/**
 * Event emitted when a new device is registered in the system
 */
export class DeviceRegisteredEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly status: DeviceStatus,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that was registered
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that was registered
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the IP address of the device that was registered
   */
  getIpAddress(): IpAddress {
    return this.ipAddress;
  }

  /**
   * Gets the status of the device that was registered
   */
  getStatus(): DeviceStatus {
    return this.status;
  }
}