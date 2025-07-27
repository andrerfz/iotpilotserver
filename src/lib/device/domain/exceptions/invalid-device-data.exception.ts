import {DeviceDomainException} from './device-domain.exception';

/**
 * Exception thrown when device data is invalid
 */
export class InvalidDeviceDataException extends DeviceDomainException {
  constructor(
    fieldName: string,
    reason: string
  ) {
    super(`Invalid device data for field '${fieldName}': ${reason}`);
    this.fieldName = fieldName;
  }

  /**
   * The name of the field that contains invalid data
   */
  readonly fieldName: string;
}