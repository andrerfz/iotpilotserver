/**
 * DeviceName Value Object
 * 
 * Represents the name of a device in the system.
 * Ensures the name is valid and provides immutability.
 */
class DeviceName {
  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new DeviceName
   * @param name The device name string
   * @returns A new DeviceName instance
   * @throws Error if the name is invalid
   */
  static create(name: string): DeviceName {
    return new DeviceName(name);
  }

  /**
   * Validates that the device name is not empty and follows the expected format
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Device name cannot be empty');
    }

    if (this.value.length < 2) {
      throw new Error('Device name must be at least 2 characters long');
    }

    if (this.value.length > 50) {
      throw new Error('Device name cannot exceed 50 characters');
    }

    // Additional validation rules can be added here
    // For example, checking if the name contains only allowed characters
  }

  /**
   * Returns the string representation of the device name
   * @returns The device name as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks if this DeviceName is equal to another DeviceName
   * @param other The other DeviceName to compare with
   * @returns True if the names are equal, false otherwise
   */
  equals(other: DeviceName): boolean {
    return this.value === other.value;
  }
}

export { DeviceName };