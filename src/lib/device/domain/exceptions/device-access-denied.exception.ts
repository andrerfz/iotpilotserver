import {DeviceDomainException} from './device-domain.exception';
import {DeviceId} from '../value-objects/device-id.vo';

/**
 * Exception thrown when access to a device is denied
 */
export class DeviceAccessDeniedException extends DeviceDomainException {
  constructor(
    deviceId: DeviceId | string,
    operation: string,
    reason?: string
  ) {
    const id = deviceId instanceof DeviceId ? deviceId.toString() : deviceId;
    
    const message = reason
      ? `Access denied for operation '${operation}' on device '${id}': ${reason}`
      : `Access denied for operation '${operation}' on device '${id}'`;
    
    super(message);
    
    this.deviceId = id;
    this.operation = operation;
  }

  /**
   * The ID of the device that access was denied for
   */
  readonly deviceId: string;

  /**
   * The operation that was attempted
   */
  readonly operation: string;
}