/**
 * DeviceType Value Object
 * 
 * Represents the type of a device in the system.
 * Ensures the device type is valid and provides immutability.
 */
class DeviceType {
  // Define allowed device types
  static readonly RASPBERRY_PI = 'RASPBERRY_PI';
  static readonly ARDUINO = 'ARDUINO';
  static readonly ESP32 = 'ESP32';
  static readonly ESP8266 = 'ESP8266';
  static readonly JETSON_NANO = 'JETSON_NANO';
  static readonly BEAGLEBONE = 'BEAGLEBONE';
  static readonly ROCK_PI = 'ROCK_PI';
  static readonly ORANGE_PI = 'ORANGE_PI';
  static readonly CUSTOM_LINUX = 'CUSTOM_LINUX';
  static readonly OTHER = 'OTHER';

  // All valid device types
  private static readonly VALID_TYPES = [
    DeviceType.RASPBERRY_PI,
    DeviceType.ARDUINO,
    DeviceType.ESP32,
    DeviceType.ESP8266,
    DeviceType.JETSON_NANO,
    DeviceType.BEAGLEBONE,
    DeviceType.ROCK_PI,
    DeviceType.ORANGE_PI,
    DeviceType.CUSTOM_LINUX,
    DeviceType.OTHER
  ];

  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new DeviceType
   * @param type The device type string
   * @returns A new DeviceType instance
   * @throws Error if the device type is invalid
   */
  static create(type: string): DeviceType {
    return new DeviceType(type.toUpperCase());
  }

  /**
   * Validates that the device type is one of the allowed types
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Device type cannot be empty');
    }

    if (!DeviceType.VALID_TYPES.includes(this.value)) {
      throw new Error(`Invalid device type: ${this.value}. Must be one of: ${DeviceType.VALID_TYPES.join(', ')}`);
    }
  }

  /**
   * Returns the string representation of the device type
   * @returns The device type as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks if this DeviceType is equal to another DeviceType
   * @param other The other DeviceType to compare with
   * @returns True if the device types are equal, false otherwise
   */
  equals(other: DeviceType): boolean {
    return this.value === other.value;
  }

  /**
   * Checks if this device type is a Raspberry Pi
   * @returns True if the device type is a Raspberry Pi, false otherwise
   */
  isRaspberryPi(): boolean {
    return this.value === DeviceType.RASPBERRY_PI;
  }

  /**
   * Checks if this device type is an Arduino
   * @returns True if the device type is an Arduino, false otherwise
   */
  isArduino(): boolean {
    return this.value === DeviceType.ARDUINO;
  }

  /**
   * Checks if this device type is an ESP32
   * @returns True if the device type is an ESP32, false otherwise
   */
  isESP32(): boolean {
    return this.value === DeviceType.ESP32;
  }

  /**
   * Checks if this device type is an ESP8266
   * @returns True if the device type is an ESP8266, false otherwise
   */
  isESP8266(): boolean {
    return this.value === DeviceType.ESP8266;
  }

  /**
   * Checks if this device type is a Jetson Nano
   * @returns True if the device type is a Jetson Nano, false otherwise
   */
  isJetsonNano(): boolean {
    return this.value === DeviceType.JETSON_NANO;
  }

  /**
   * Checks if this device type is a BeagleBone
   * @returns True if the device type is a BeagleBone, false otherwise
   */
  isBeagleBone(): boolean {
    return this.value === DeviceType.BEAGLEBONE;
  }

  /**
   * Checks if this device type is a Rock Pi
   * @returns True if the device type is a Rock Pi, false otherwise
   */
  isRockPi(): boolean {
    return this.value === DeviceType.ROCK_PI;
  }

  /**
   * Checks if this device type is an Orange Pi
   * @returns True if the device type is an Orange Pi, false otherwise
   */
  isOrangePi(): boolean {
    return this.value === DeviceType.ORANGE_PI;
  }

  /**
   * Checks if this device type is a custom Linux device
   * @returns True if the device type is a custom Linux device, false otherwise
   */
  isCustomLinux(): boolean {
    return this.value === DeviceType.CUSTOM_LINUX;
  }

  /**
   * Checks if this device type is 'Other'
   * @returns True if the device type is 'Other', false otherwise
   */
  isOther(): boolean {
    return this.value === DeviceType.OTHER;
  }

  /**
   * Checks if this device type supports SSH
   * @returns True if the device type supports SSH, false otherwise
   */
  supportsSSH(): boolean {
    return [
      DeviceType.RASPBERRY_PI,
      DeviceType.JETSON_NANO,
      DeviceType.BEAGLEBONE,
      DeviceType.ROCK_PI,
      DeviceType.ORANGE_PI,
      DeviceType.CUSTOM_LINUX
    ].includes(this.value);
  }

  /**
   * Gets all valid device types
   * @returns Array of all valid device types
   */
  static getAllTypes(): string[] {
    return [...DeviceType.VALID_TYPES];
  }
}

export { DeviceType };