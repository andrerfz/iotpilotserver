import {ValueObject} from '@iotpilot/core/shared/domain/base.value-object';

export type CustomerStatusType = 'active' | 'inactive' | 'suspended' | 'pending';

export interface CustomerStatusData {
  value: CustomerStatusType;
}

export class CustomerStatus extends ValueObject<CustomerStatusData> {
  private constructor(value: CustomerStatusType) {
    super({ value });
  }

  static create(value: CustomerStatusType): CustomerStatus {
    const validStatuses: CustomerStatusType[] = ['active', 'inactive', 'suspended', 'pending'];
    
    if (!validStatuses.includes(value)) {
      throw new Error(`Invalid customer status: ${value}`);
    }

    return new CustomerStatus(value);
  }

  static active(): CustomerStatus {
    return CustomerStatus.create('active');
  }

  static inactive(): CustomerStatus {
    return CustomerStatus.create('inactive');
  }

  static suspended(): CustomerStatus {
    return CustomerStatus.create('suspended');
  }

  static pending(): CustomerStatus {
    return CustomerStatus.create('pending');
  }

  static fromString(value: string): CustomerStatus {
    return CustomerStatus.create(value as CustomerStatusType);
  }

  get value(): CustomerStatusType {
    return this.props.value;
  }

  getValue(): CustomerStatusType {
    return this.value;
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isInactive(): boolean {
    return this.value === 'inactive';
  }

  isSuspended(): boolean {
    return this.value === 'suspended';
  }

  isPending(): boolean {
    return this.value === 'pending';
  }

  equals(other: CustomerStatus): boolean {
    return this.value === other.value;
  }

  toJSON(): CustomerStatusData {
    return { value: this.value };
  }
}
