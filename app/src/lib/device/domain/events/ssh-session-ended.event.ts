import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';

export class SSHSessionEndedEvent extends DomainEventBase {
  constructor(
    public readonly deviceId: DeviceId,
    public readonly deviceName: DeviceName,
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly duration: number, // in seconds
    public readonly reason?: string
  ) {
    super();
  }

  static create(
    deviceId: DeviceId,
    deviceName: DeviceName,
    sessionId: string,
    userId: string,
    duration: number,
    reason?: string
  ): SSHSessionEndedEvent {
    return new SSHSessionEndedEvent(
      deviceId,
      deviceName,
      sessionId,
      userId,
      duration,
      reason
    );
  }
}