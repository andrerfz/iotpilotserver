/**
 * IPAddress Value Object
 * 
 * Represents an IP address for a device in the system.
 * Ensures the IP address is valid and provides immutability.
 */
class IPAddress {
  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new IPAddress
   * @param ipAddress The IP address string
   * @returns A new IPAddress instance
   * @throws Error if the IP address is invalid
   */
  static create(ipAddress: string): IPAddress {
    return new IPAddress(ipAddress);
  }

  /**
   * Validates that the IP address is in a valid format
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('IP address cannot be empty');
    }

    // IPv4 validation
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = this.value.match(ipv4Regex);

    if (ipv4Match) {
      // Check that each octet is between 0 and 255
      const validOctets = ipv4Match.slice(1).every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });

      if (!validOctets) {
        throw new Error('Invalid IPv4 address: octets must be between 0 and 255');
      }
      
      return; // Valid IPv4 address
    }

    // IPv6 validation (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:((:[0-9a-fA-F]{1,4}){1,7})?$|^([0-9a-fA-F]{1,4}:){1,6}:([0-9a-fA-F]{1,4}:){0,1}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:([0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4})?$|^([0-9a-fA-F]{1,4}:){1,4}(:([0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4})?$|^([0-9a-fA-F]{1,4}:){1,3}(:([0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4})?$|^([0-9a-fA-F]{1,4}:){1,2}(:([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4})?$|^[0-9a-fA-F]{1,4}:(:([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?$/;
    
    if (ipv6Regex.test(this.value)) {
      return; // Valid IPv6 address
    }

    // Allow hostnames for development purposes
    const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
    
    if (hostnameRegex.test(this.value)) {
      return; // Valid hostname
    }

    throw new Error('Invalid IP address format');
  }

  /**
   * Returns the string representation of the IP address
   * @returns The IP address as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks if this IPAddress is equal to another IPAddress
   * @param other The other IPAddress to compare with
   * @returns True if the IP addresses are equal, false otherwise
   */
  equals(other: IPAddress): boolean {
    return this.value === other.value;
  }

  /**
   * Checks if this IP address is a loopback address
   * @returns True if the IP address is a loopback address, false otherwise
   */
  isLoopback(): boolean {
    return this.value === '127.0.0.1' || this.value === '::1' || this.value.toLowerCase() === 'localhost';
  }

  /**
   * Checks if this IP address is a private address
   * @returns True if the IP address is a private address, false otherwise
   */
  isPrivate(): boolean {
    // Check for IPv4 private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = this.value.match(ipv4Regex);

    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(octet => parseInt(octet, 10));
      
      // 10.0.0.0/8
      if (a === 10) return true;
      
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;
      
      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;
      
      return false;
    }

    // Simplified check for IPv6 private addresses
    return this.value.startsWith('fc') || this.value.startsWith('fd');
  }
}

export { IPAddress };