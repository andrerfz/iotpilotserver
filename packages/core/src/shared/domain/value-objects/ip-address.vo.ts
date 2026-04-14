import {ValueObject} from '../base.value-object';

class IpAddressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpAddressValidationError';
  }
}

export interface IpAddressProps {
  value: string;
  version: 'ipv4' | 'ipv6' | 'unknown';
  isPrivate: boolean;
  isLinkLocal: boolean;
}

export class IpAddress extends ValueObject<IpAddressProps> {
  private static readonly IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  private static readonly IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^([0-9a-fA-F]{1,4}:){0,7}[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}:){0,7}[0-9a-fA-F]{1,4}$/;
  private static readonly PRIVATE_IPV4_RANGES = [
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./      // 192.168.0.0/16
  ];

  constructor(props: IpAddressProps) {
    super(props);
  }

  static fromString(value: string): IpAddress {
    if (!value || typeof value !== 'string') {
      throw new IpAddressValidationError('IP address must be a non-empty string');
    }

    const normalized = value.trim().toLowerCase();

    // Validate IPv4
    if (this.IPV4_REGEX.test(normalized)) {
      return new IpAddress({
        value: normalized,
        version: 'ipv4',
        isPrivate: this.isPrivateIPv4(normalized),
        isLinkLocal: this.isLinkLocalIPv4(normalized)
      });
    }

    // Validate IPv6 (simplified - full IPv6 validation is complex)
    if (this.IPV6_REGEX.test(normalized) || normalized === '::1' || normalized === '::') {
      return new IpAddress({
        value: normalized,
        version: 'ipv6',
        isPrivate: this.isPrivateIPv6(normalized),
        isLinkLocal: this.isLinkLocalIPv6(normalized)
      });
    }

    throw new IpAddressValidationError(`Invalid IP address format: ${value}`);
  }

  static create(value: string, version?: 'ipv4' | 'ipv6'): IpAddress {
    return this.fromString(value);
  }

  // IPv4 private network detection
  private static isPrivateIPv4(ip: string): boolean {
    return this.PRIVATE_IPV4_RANGES.some(regex => regex.test(ip));
  }

  private static isLinkLocalIPv4(ip: string): boolean {
    return /^169\.254\./.test(ip); // 169.254.0.0/16
  }

  // IPv6 private network detection (simplified)
  private static isPrivateIPv6(ip: string): boolean {
    return ip.startsWith('fc00:') || ip.startsWith('fd'); // Unique Local Addresses
  }

  private static isLinkLocalIPv6(ip: string): boolean {
    return ip.startsWith('fe80:'); // Link-local addresses
  }

  // Getters
  get value(): string {
    return this.props.value;
  }

  get version(): 'ipv4' | 'ipv6' | 'unknown' {
    return this.props.version;
  }

  get isPrivate(): boolean {
    return this.props.isPrivate;
  }

  get isLinkLocal(): boolean {
    return this.props.isLinkLocal;
  }

  // Validation methods
  isIPv4(): boolean {
    return this.version === 'ipv4';
  }

  isIPv6(): boolean {
    return this.version === 'ipv6';
  }

  isPublic(): boolean {
    return !this.isPrivate && !this.isLinkLocal;
  }

  // Utility methods
  toString(): string {
    return this.value;
  }


  // Network utilities
  isInSameNetwork(other: IpAddress, cidr?: number): boolean {
    if (this.version !== other.version) {
      return false;
    }

    if (!cidr) {
      cidr = this.isIPv4() ? 24 : 64; // Default /24 for IPv4, /64 for IPv6
    }

    // Implementation would use network calculation
    // For now, simplified comparison
    const thisParts = this.value.split('.');
    const otherParts = other.value.split('.');
    
    if (this.isIPv4() && thisParts.length === 4 && otherParts.length === 4) {
      const mask = Math.floor(cidr / 8);
      for (let i = 0; i < mask; i++) {
        if (thisParts[i] !== otherParts[i]) {
          return false;
        }
      }
      return true;
    }

    // IPv6 comparison would be more complex
    return this.value === other.value;
  }

  // Security methods
  isLoopback(): boolean {
    if (this.isIPv4()) {
      return this.value === '127.0.0.1';
    }
    if (this.isIPv6()) {
      return this.value === '::1';
    }
    return false;
  }

  isMulticast(): boolean {
    if (this.isIPv4()) {
      const firstOctet = parseInt(this.value.split('.')[0]);
      return firstOctet >= 224 && firstOctet <= 239;
    }
    if (this.isIPv6()) {
      return this.value.startsWith('ff');
    }
    return false;
  }

  // String representation for logging/display
  toDisplayString(): string {
    return this.value;
  }

  // JSON serialization
  toJSON(): IpAddressProps {
    return this.props;
  }

  // Validation for specific use cases
  isValidForSSH(): boolean {
    // SSH typically works with IPv4/IPv6, but not loopback or multicast
    return this.isPublic() && !this.isLoopback() && !this.isMulticast();
  }

  isValidForDocker(): boolean {
    // Docker typically needs private or loopback addresses
    return this.isPrivate || this.isLoopback();
  }

  getValue(): string {
    return this.value;
  }

  // Type guards
  static isIpAddress(value: any): value is IpAddress {
    return value instanceof IpAddress;
  }
}
