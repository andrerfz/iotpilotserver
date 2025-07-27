import {TenantScopedEventBase} from '@/lib/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when an SSH session with a device ends
 */
export class SSHSessionEndedEvent extends TenantScopedEventBase {
  constructor(
    public readonly sessionId: string,
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly endTimestamp: Date,
    public readonly duration: number, // Duration in seconds
    public readonly endedBy: string,
    public readonly endReason: string | null,
    public readonly wasGraceful: boolean,
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
   * Gets the ID of the device that the SSH session was connected to
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that the SSH session was connected to
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the timestamp when the SSH session ended
   */
  getEndTimestamp(): Date {
    return this.endTimestamp;
  }

  /**
   * Gets the duration of the SSH session in seconds
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Gets the identifier of the user or process that ended the SSH session
   */
  getEndedBy(): string {
    return this.endedBy;
  }

  /**
   * Gets the reason why the SSH session ended, if available
   */
  getEndReason(): string | null {
    return this.endReason;
  }

  /**
   * Indicates whether the SSH session ended gracefully
   */
  wasEndingGraceful(): boolean {
    return this.wasGraceful;
  }
}