import { ValueObject, ValueObjectInterface } from '../../../../shared/domain/interfaces/value-object.interface';

export enum CustomerStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

export class CustomerStatus extends ValueObject {
  constructor(private readonly value: CustomerStatusEnum) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!Object.values(CustomerStatusEnum).includes(this.value)) {
      throw new Error(`Invalid customer status: ${this.value}`);
    }
  }

  getValue(): CustomerStatusEnum {
    return this.value;
  }

  isActive(): boolean {
    return this.value === CustomerStatusEnum.ACTIVE;
  }

  isInactive(): boolean {
    return this.value === CustomerStatusEnum.INACTIVE;
  }

  isSuspended(): boolean {
    return this.value === CustomerStatusEnum.SUSPENDED;
  }

  isPending(): boolean {
    return this.value === CustomerStatusEnum.PENDING;
  }

  equals(other: ValueObjectInterface): boolean {
    if (!(other instanceof CustomerStatus)) {
      return false;
    }
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}