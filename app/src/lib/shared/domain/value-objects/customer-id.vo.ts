import {ValueObject} from '../base.value-object';

class CustomerIdValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerIdValidationError';
  }
}

export interface CustomerIdData {
  value: string;
}

export class CustomerId extends ValueObject<CustomerIdData> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): CustomerId {
    if (!value || value.trim().length === 0) {
      throw new CustomerIdValidationError('Customer ID cannot be empty');
    }

    if (value.length > 36) {
      throw new CustomerIdValidationError('Customer ID too long');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new CustomerIdValidationError('Customer ID must be valid UUID format');
    }

    return new CustomerId(value.trim());
  }

  static fromString(value: string): CustomerId {
    return CustomerId.create(value);
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CustomerId): boolean {
    return this.value === other.value;
  }

  toJSON(): CustomerIdData {
    return { value: this.value };
  }
}