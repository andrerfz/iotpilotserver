/**
 * MACAddress Value Object
 * 
 * Represents a MAC address for a device in the system.
 * Ensures the MAC address is valid and provides immutability.
 */
class MACAddress {
  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new MACAddress
   * @param macAddress The MAC address string
   * @returns A new MACAddress instance
   * @throws Error if the MAC address is invalid
   */
  static create(macAddress: string): MACAddress {
    return new MACAddress(macAddress);
  }

  /**
   * Validates that the MAC address is in a valid format
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('MAC address cannot be empty');
    }

    // Normalize the MAC address by removing any separators
    const normalizedMac = this.value.replace(/[:-]/g, '').toLowerCase();

    // Check if it's a valid MAC-48 or EUI-48 address (12 hexadecimal digits)
    const macRegex = /^[0-9a-f]{12}$/;
    if (!macRegex.test(normalizedMac)) {
      throw new Error('Invalid MAC address format');
    }

    // Check if it's a broadcast MAC address (all Fs)
    if (normalizedMac === 'ffffffffffff') {
      throw new Error('Broadcast MAC address is not allowed');
    }

    // Check if it's a null MAC address (all 0s)
    if (normalizedMac === '000000000000') {
      throw new Error('Null MAC address is not allowed');
    }
  }

  /**
   * Returns the string representation of the MAC address
   * @returns The MAC address as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns the MAC address in a standardized format (XX:XX:XX:XX:XX:XX)
   * @returns The formatted MAC address
   */
  toFormattedString(): string {
    // Remove any existing separators and convert to lowercase
    const clean = this.value.replace(/[:-]/g, '').toLowerCase();
    
    // Insert colons every two characters
    return clean.match(/.{2}/g)?.join(':') || this.value;
  }

  /**
   * Checks if this MACAddress is equal to another MACAddress
   * @param other The other MACAddress to compare with
   * @returns True if the MAC addresses are equal, false otherwise
   */
  equals(other: MACAddress): boolean {
    // Compare the normalized versions (no separators, lowercase)
    const thisNormalized = this.value.replace(/[:-]/g, '').toLowerCase();
    const otherNormalized = other.toString().replace(/[:-]/g, '').toLowerCase();
    
    return thisNormalized === otherNormalized;
  }

  /**
   * Checks if this MAC address is a unicast address
   * @returns True if the MAC address is a unicast address, false otherwise
   */
  isUnicast(): boolean {
    // The least significant bit of the first octet is 0 for unicast
    const firstByte = parseInt(this.value.replace(/[:-]/g, '').substring(0, 2), 16);
    return (firstByte & 0x01) === 0;
  }

  /**
   * Checks if this MAC address is a multicast address
   * @returns True if the MAC address is a multicast address, false otherwise
   */
  isMulticast(): boolean {
    // The least significant bit of the first octet is 1 for multicast
    const firstByte = parseInt(this.value.replace(/[:-]/g, '').substring(0, 2), 16);
    return (firstByte & 0x01) === 1;
  }

  /**
   * Checks if this MAC address is locally administered
   * @returns True if the MAC address is locally administered, false otherwise
   */
  isLocallyAdministered(): boolean {
    // The second least significant bit of the first octet is 1 for locally administered
    const firstByte = parseInt(this.value.replace(/[:-]/g, '').substring(0, 2), 16);
    return (firstByte & 0x02) === 0x02;
  }

  /**
   * Checks if this MAC address is globally unique (OUI enforced)
   * @returns True if the MAC address is globally unique, false otherwise
   */
  isGloballyUnique(): boolean {
    // The second least significant bit of the first octet is 0 for globally unique
    const firstByte = parseInt(this.value.replace(/[:-]/g, '').substring(0, 2), 16);
    return (firstByte & 0x02) === 0;
  }
}

export { MACAddress };