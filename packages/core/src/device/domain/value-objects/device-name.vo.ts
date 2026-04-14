import {ValueObject} from '../../../shared/domain/base.value-object';
import {ValueObjectValidationException} from '../../../shared/domain/exceptions/value-object-validation.exception';

export interface DeviceNameData {
  value: string;
}

export class DeviceName extends ValueObject<DeviceNameData> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): DeviceName {
    if (!value || value.trim().length === 0) {
      throw new ValueObjectValidationException('Device name cannot be empty', 'deviceName');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 1) {
      throw new ValueObjectValidationException('Device name must be at least 1 character', 'deviceName');
    }

    if (trimmedValue.length > 100) {
      throw new ValueObjectValidationException('Device name cannot exceed 100 characters', 'deviceName', { length: trimmedValue.length });
    }

    if (!/^[a-zA-Z0-9\s\-_\.&()\/#+:,]+$/.test(trimmedValue)) {
      throw new ValueObjectValidationException('Device name contains invalid characters', 'deviceName', { value: trimmedValue });
    }

    return new DeviceName(trimmedValue);
  }

  static fromString(value: string): DeviceName {
    return DeviceName.create(value);
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DeviceName): boolean {
    return this.value === other.value;
  }

  toJSON(): DeviceNameData {
    return { value: this.value };
  }
}
