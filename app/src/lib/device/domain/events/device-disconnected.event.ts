import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';

export class DeviceDisconnectedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly connectionType: 'ssh' | 'http' | 'mqtt' | 'other',
    public readonly reason?: string
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName,
    connectionType: 'ssh' | 'http' | 'mqtt' | 'other' = 'other',
    reason?: string
  ): DeviceDisconnectedEvent {
    return new DeviceDisconnectedEvent(deviceId, deviceName, connectionType, reason);
  }
}