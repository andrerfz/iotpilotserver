import {TenantScopedEventBase} from '@/lib/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when a device is deactivated
 */
export class DeviceDeactivatedEvent extends TenantScopedEventBase {
  static readonly EVENT_TYPE = 'device.deactivated';

  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

}