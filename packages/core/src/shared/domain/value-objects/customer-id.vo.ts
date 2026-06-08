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

    const trimmedValue = value.trim();

    // Check if it's too long
    if (trimmedValue.length > 36) {
      throw new CustomerIdValidationError('Customer ID too long');
    }

    // Accept both UUID and CUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{24,}$/i;
    
    if (!uuidRegex.test(trimmedValue) && !cuidRegex.test(trimmedValue)) {
      throw new CustomerIdValidationError('Customer ID must be valid UUID or CUID format');
    }

    return new CustomerId(trimmedValue);
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