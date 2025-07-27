import {TenantScopedEventBase} from '@/lib/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';
import {DeviceStatus} from '../value-objects/device-status.vo';

/**
 * Event emitted when a device is updated in the system
 */
export class DeviceUpdatedEvent extends TenantScopedEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly status: DeviceStatus,
    public readonly updatedFields: string[],
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

  /**
   * Gets the ID of the device that was updated
   */
  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  /**
   * Gets the name of the device that was updated
   */
  getDeviceName(): DeviceName {
    return this.deviceName;
  }

  /**
   * Gets the IP address of the device that was updated
   */
  getIpAddress(): IpAddress {
    return this.ipAddress;
  }

  /**
   * Gets the status of the device that was updated
   */
  getStatus(): DeviceStatus {
    return this.status;
  }

  /**
   * Gets the list of fields that were updated
   */
  getUpdatedFields(): string[] {
    return this.updatedFields;
  }

  /**
   * Checks if a specific field was updated
   */
  wasFieldUpdated(fieldName: string): boolean {
    return this.updatedFields.includes(fieldName);
  }
}