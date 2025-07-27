import {ValueObject} from '../../../shared/domain/base.value-object';
import {ValueObjectValidationException} from '../../../shared/domain/exceptions/value-object-validation.exception';

export interface IpAddressData {
  value: string;
}

export class IpAddress extends ValueObject<IpAddressData> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): IpAddress {
    if (!value || value.trim().length === 0) {
      throw new ValueObjectValidationException('IP address cannot be empty', 'ipAddress');
    }

    const trimmedValue = value.trim();

    // IPv4 validation
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!ipv4Regex.test(trimmedValue)) {
      throw new ValueObjectValidationException('Invalid IP address format', 'ipAddress', { value: trimmedValue });
    }

    // Additional validation for octet ranges
    const octets = trimmedValue.split('.');
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (num < 0 || num > 255) {
        throw new ValueObjectValidationException('IP address octets must be between 0 and 255', 'ipAddress', { value: trimmedValue, octet: num });
      }
    }

    return new IpAddress(trimmedValue);
  }

  static fromString(value: string): IpAddress {
    return IpAddress.create(value);
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: IpAddress): boolean {
    return this.value === other.value;
  }

  toJSON(): IpAddressData {
    return { value: this.value };
  }
}
