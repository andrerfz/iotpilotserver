import { ValueObject, ValueObjectInterface } from '../../../../shared/domain/interfaces/value-object.interface';

export class CustomerId extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('CustomerId cannot be empty');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ValueObjectInterface): boolean {
    if (!(other instanceof CustomerId)) {
      return false;
    }
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}