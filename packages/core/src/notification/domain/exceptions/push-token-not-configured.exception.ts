import { DomainException } from '@iotpilot/core/shared/domain/exceptions/domain.exception';

export class PushTokenNotConfiguredException extends DomainException {
  constructor(userId: string) {
    super(`No push tokens registered for user: ${userId}`, 'PUSH_TOKEN_NOT_CONFIGURED');
  }
}
