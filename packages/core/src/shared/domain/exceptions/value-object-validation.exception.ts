import {DomainException} from './domain.exception';

/**
 * Exception thrown when a value object validation fails
 * This is a concrete implementation of DomainException for value object validation errors
 */
export class ValueObjectValidationException extends DomainException {
  constructor(
    message: string,
    public readonly field?: string,
    details?: Record<string, any>
  ) {
    super(message, 'VALUE_OBJECT_VALIDATION_ERROR', {
      field,
      ...details
    });
  }
}

