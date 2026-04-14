import {ValueObject} from '../../../shared/domain/base.value-object';
import {ValueObjectValidationException} from '../../../shared/domain/exceptions/value-object-validation.exception';

export interface DeviceIdData {
  value: string;
}

export class DeviceId extends ValueObject<DeviceIdData> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): DeviceId {
    if (!value || value.trim().length === 0) {
      throw new ValueObjectValidationException('Device ID cannot be empty', 'deviceId');
    }

    const trimmedValue = value.trim();
    
    // Device IDs can be UUIDs, serial numbers, MAC addresses, or custom identifiers
    // Valid characters: alphanumeric, hyphens, underscores, colons, dots
    // Examples: "550e8400-e29b-41d4-a716-446655440000", "RPI-2024-001", "test-device-docker"
    const deviceIdRegex = /^[a-zA-Z0-9_\-:.]+$/;
    
    if (!deviceIdRegex.test(trimmedValue)) {
      throw new ValueObjectValidationException(
        'Device ID can only contain alphanumeric characters, hyphens, underscores, colons, and dots',
        'deviceId',
        { value: trimmedValue }
      );
    }

    if (trimmedValue.length > 255) {
      throw new ValueObjectValidationException('Device ID too long (max 255 characters)', 'deviceId');
    }

    return new DeviceId(trimmedValue);
  }

  static fromString(value: string): DeviceId {
    return DeviceId.create(value);
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  toJSON(): DeviceIdData {
    return { value: this.value };
  }
}
