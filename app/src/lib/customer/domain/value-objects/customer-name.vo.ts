import {ValueObject} from '@/lib/shared/domain/base.value-object';

export interface CustomerNameData {
  value: string;
}

export class CustomerName extends ValueObject<CustomerNameData> {
  private constructor(value: string) {
    super({ value });
    this.validate();
  }

  private validate(): void {
    if (!this.props.value || this.props.value.trim().length === 0) {
      throw new Error('CustomerName cannot be empty');
    }

    if (this.props.value.length > 100) {
      throw new Error('CustomerName cannot be longer than 100 characters');
    }
  }

  static create(value: string): CustomerName {
    return new CustomerName(value);
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
    if (!(other instanceof CustomerName)) {
      return false;
    }
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  toJSON(): CustomerNameData {
    return { value: this.value };
  }
}
