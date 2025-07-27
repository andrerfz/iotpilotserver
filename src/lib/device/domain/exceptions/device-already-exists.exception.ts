import {DeviceDomainException} from './device-domain.exception';
import {DeviceId} from '../value-objects/device-id.vo';

/**
 * Exception thrown when attempting to create a device that already exists
 */
export class DeviceAlreadyExistsException extends DeviceDomainException {
  constructor(deviceId: DeviceId | string) {
    const id = deviceId instanceof DeviceId ? deviceId.toString() : deviceId;
    super(`Device with ID '${id}' already exists`);
  }
}