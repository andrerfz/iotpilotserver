import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';

/**
 * Event emitted when an SSH session is started with a device
 */
export class SSHSessionStartedEvent extends TenantScopedEventBase {
  constructor(
    public readonly sessionId: string,
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly startedBy: string,
    public readonly startTimestamp: Date,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the SSH session
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Gets the ID of the device that the SSH session is connected to
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that the SSH session is connected to
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the IP address of the device that the SSH session is connected to
   */
  getIpAddress(): IpAddress {
    return this.ipAddress;
  }

  /**
   * Gets the identifier of the user or process that started the SSH session
   */
  getStartedBy(): string {
    return this.startedBy;
  }

  /**
   * Gets the timestamp when the SSH session was started
   */
  getStartTimestamp(): Date {
    return this.startTimestamp;
  }
}