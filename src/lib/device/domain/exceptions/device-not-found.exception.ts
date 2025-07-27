import {DeviceDomainException} from './device-domain.exception';
import {DeviceId} from '../value-objects/device-id.vo';

/**
 * Exception thrown when a device is not found in the system
 */
export class DeviceNotFoundException extends DeviceDomainException {
  constructor(deviceId: DeviceId | string) {
    const id = deviceId instanceof DeviceId ? deviceId.toString() : deviceId;
    super(`Device with ID '${id}' not found`);
  }
}