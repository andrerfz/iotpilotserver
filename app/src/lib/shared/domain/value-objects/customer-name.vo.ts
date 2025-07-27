import {ValueObject} from '../base.value-object';

class CustomerNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerNameValidationError';
  }
}

export interface CustomerNameData {
  value: string;
}

export class CustomerName extends ValueObject<CustomerNameData> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): CustomerName {
    if (!value || value.trim().length === 0) {
      throw new CustomerNameValidationError('Customer name cannot be empty');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      throw new CustomerNameValidationError('Customer name must be at least 2 characters');
    }

    if (trimmedValue.length > 200) {
      throw new CustomerNameValidationError('Customer name cannot exceed 200 characters');
    }

    return new CustomerName(trimmedValue);
  }

  static fromString(value: string): CustomerName {
    return CustomerName.create(value);
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CustomerName): boolean {
    return this.value === other.value;
  }

  toJSON(): CustomerNameData {
    return { value: this.value };
  }

  toString(): string {
    return this.value;
  }
}
