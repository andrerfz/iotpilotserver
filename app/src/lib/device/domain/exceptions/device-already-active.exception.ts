import {DomainException} from '../../../shared/domain/exceptions/domain.exception';

export class DeviceAlreadyActiveException extends DomainException {
  constructor(deviceId: string) {
    super(
      `Device with ID ${deviceId} is already active`,
      'DEVICE_ALREADY_ACTIVE',
      { deviceId }
    );
  }
}
