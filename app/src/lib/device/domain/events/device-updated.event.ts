import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { DeviceStatus } from '../value-objects/device-status.vo';

export class DeviceUpdatedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly updatedFields: {
      name?: DeviceName;
      ipAddress?: IpAddress;
      status?: DeviceStatus;
      sshCredentialsUpdated?: boolean;
    }
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    updatedFields: {
      name?: DeviceName;
      ipAddress?: IpAddress;
      status?: DeviceStatus;
      sshCredentialsUpdated?: boolean;
    }
  ): DeviceUpdatedEvent {
    return new DeviceUpdatedEvent(deviceId, updatedFields);
  }
}