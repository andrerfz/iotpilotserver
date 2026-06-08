import { DomainException } from '@iotpilot/core/shared/domain/exceptions/domain.exception';

export class NotificationNotFoundException extends DomainException {
  constructor(id: string) {
    super(`NotificationRecord not found: ${id}`, 'NOTIFICATION_NOT_FOUND');
  }
}
