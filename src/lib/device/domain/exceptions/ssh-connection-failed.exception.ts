import {DeviceDomainException} from './device-domain.exception';
import {DeviceId} from '../value-objects/device-id.vo';
import {IPAddress} from '../value-objects/ip-address.vo';

/**
 * Exception thrown when an SSH connection to a device fails
 */
export class SSHConnectionFailedException extends DeviceDomainException {
  constructor(
    deviceIdOrIp: DeviceId | IPAddress | string,
    reason?: string
  ) {
    const identifier = deviceIdOrIp instanceof DeviceId || deviceIdOrIp instanceof IPAddress
      ? deviceIdOrIp.toString()
      : deviceIdOrIp;
    
    const message = reason
      ? `SSH connection to device '${identifier}' failed: ${reason}`
      : `SSH connection to device '${identifier}' failed`;
    
    super(message);
  }
}