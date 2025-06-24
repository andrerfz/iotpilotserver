import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';

export class DeviceRemovedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName
  ): DeviceRemovedEvent {
    return new DeviceRemovedEvent(deviceId, deviceName);
  }
}