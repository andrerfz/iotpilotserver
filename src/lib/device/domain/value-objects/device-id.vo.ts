/**
 * DeviceId Value Object
 * 
 * Represents a unique identifier for a device in the system.
 * Ensures the ID is valid and provides immutability.
 */
class DeviceId {
  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new DeviceId
   * @param id The device ID string
   * @returns A new DeviceId instance
   * @throws Error if the ID is invalid
   */
  static create(id: string): DeviceId {
    return new DeviceId(id);
  }

  /**
   * Validates that the device ID is not empty and follows the expected format
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Device ID cannot be empty');
    }

    if (this.value.length < 3) {
      throw new Error('Device ID must be at least 3 characters long');
    }

    // Additional validation rules can be added here
    // For example, checking if the ID follows a specific format
  }

  /**
   * Returns the string representation of the device ID
   * @returns The device ID as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks if this DeviceId is equal to another DeviceId
   * @param other The other DeviceId to compare with
   * @returns True if the IDs are equal, false otherwise
   */
  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }
}

export { DeviceId };