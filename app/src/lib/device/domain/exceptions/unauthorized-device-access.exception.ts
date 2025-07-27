import {DomainException} from '../../../shared/domain/exceptions/domain.exception';

export class UnauthorizedDeviceAccessException extends DomainException {
  constructor(deviceId: string, userId: string) {
    super(
      `User ${userId} is not authorized to access device ${deviceId}`,
      'UNAUTHORIZED_DEVICE_ACCESS',
      { deviceId, userId }
    );
  }
}