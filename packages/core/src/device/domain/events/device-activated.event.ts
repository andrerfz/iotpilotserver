import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when a device is activated
 */
export class DeviceActivatedEvent extends TenantScopedEventBase {
  static readonly EVENT_TYPE = 'device.activated';

  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

}