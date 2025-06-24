import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';

export class DeviceConnectedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly connectionType: 'ssh' | 'http' | 'mqtt' | 'other'
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName,
    ipAddress: IpAddress,
    connectionType: 'ssh' | 'http' | 'mqtt' | 'other' = 'other'
  ): DeviceConnectedEvent {
    return new DeviceConnectedEvent(deviceId, deviceName, ipAddress, connectionType);
  }
}