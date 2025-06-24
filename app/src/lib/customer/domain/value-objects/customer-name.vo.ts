import { ValueObject, ValueObjectInterface } from '@/lib/shared/domain/interfaces/value-object.interface';

export class CustomerName extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('CustomerName cannot be empty');
    }

    if (this.value.length > 100) {
      throw new Error('CustomerName cannot be longer than 100 characters');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ValueObjectInterface): boolean {
    if (!(other instanceof CustomerName)) {
      return false;
    }
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  static create(value: string): CustomerName {
    return new CustomerName(value);
  }
}
