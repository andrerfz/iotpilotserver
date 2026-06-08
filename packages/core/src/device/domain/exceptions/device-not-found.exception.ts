import {DomainException} from '../../../shared/domain/exceptions/domain.exception';

export class DeviceNotFoundException extends DomainException {
  constructor(deviceId: string) {
    super(
      `Device with ID ${deviceId} not found`,
      'DEVICE_NOT_FOUND',
      { deviceId }
    );
  }
}