import {DomainException} from '../../../shared/domain/exceptions/domain.exception';

export class DeviceAlreadyInactiveException extends DomainException {
  constructor(deviceId: string) {
    super(
      `Device with ID ${deviceId} is already inactive`,
      'DEVICE_ALREADY_INACTIVE',
      { deviceId }
    );
  }
}
