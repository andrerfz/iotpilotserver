import { DomainException } from '@iotpilot/core/shared/domain/exceptions/domain.exception';

export class NotificationAlreadyTerminalException extends DomainException {
  constructor(id: string, currentStatus: string) {
    super(
      `NotificationRecord ${id} cannot be transitioned: current status is ${currentStatus}`,
      'NOTIFICATION_ALREADY_TERMINAL',
    );
  }
}
