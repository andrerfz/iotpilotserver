import {TenantScopedEventBase} from '@iotpilot/core/shared/domain/events/tenant-scoped-event';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';

/**
 * Event emitted when an SSH command is executed on a device
 */
export class SSHCommandExecutedEvent extends TenantScopedEventBase {
  static readonly EVENT_TYPE = 'device.ssh.command.executed';

  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly command: string,
    public readonly output: string,
    public readonly error: string | null,
    tenantId: CustomerId
  ) {
    super(tenantId);
  }

}