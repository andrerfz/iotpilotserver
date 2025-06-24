import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { Port } from '../value-objects/port.vo';

export class SSHSessionStartedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly ipAddress: IpAddress,
    public readonly port: Port,
    public readonly sessionId: string,
    public readonly userId: string
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName,
    ipAddress: IpAddress,
    port: Port,
    sessionId: string,
    userId: string
  ): SSHSessionStartedEvent {
    return new SSHSessionStartedEvent(
      deviceId,
      deviceName,
      ipAddress,
      port,
      sessionId,
      userId
    );
  }
}