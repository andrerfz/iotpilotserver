/**
 * DeviceStatus Value Object
 * 
 * Represents the status of a device in the system.
 * Ensures the device status is valid and provides immutability.
 */
class DeviceStatus {
  // Define allowed device statuses
  static readonly ONLINE = 'ONLINE';
  static readonly OFFLINE = 'OFFLINE';
  static readonly MAINTENANCE = 'MAINTENANCE';
  static readonly PROVISIONING = 'PROVISIONING';
  static readonly ERROR = 'ERROR';
  static readonly UNKNOWN = 'UNKNOWN';

  // All valid device statuses
  private static readonly VALID_STATUSES = [
    DeviceStatus.ONLINE,
    DeviceStatus.OFFLINE,
    DeviceStatus.MAINTENANCE,
    DeviceStatus.PROVISIONING,
    DeviceStatus.ERROR,
    DeviceStatus.UNKNOWN
  ];

  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Factory method to create a new DeviceStatus
   * @param status The device status string
   * @returns A new DeviceStatus instance
   * @throws Error if the device status is invalid
   */
  static create(status: string): DeviceStatus {
    return new DeviceStatus(status.toUpperCase());
  }

  /**
   * Creates a DeviceStatus with ONLINE status
   * @returns A new DeviceStatus instance with ONLINE status
   */
  static online(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.ONLINE);
  }

  /**
   * Creates a DeviceStatus with OFFLINE status
   * @returns A new DeviceStatus instance with OFFLINE status
   */
  static offline(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.OFFLINE);
  }

  /**
   * Creates a DeviceStatus with MAINTENANCE status
   * @returns A new DeviceStatus instance with MAINTENANCE status
   */
  static maintenance(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.MAINTENANCE);
  }

  /**
   * Creates a DeviceStatus with PROVISIONING status
   * @returns A new DeviceStatus instance with PROVISIONING status
   */
  static provisioning(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.PROVISIONING);
  }

  /**
   * Creates a DeviceStatus with ERROR status
   * @returns A new DeviceStatus instance with ERROR status
   */
  static error(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.ERROR);
  }

  /**
   * Creates a DeviceStatus with UNKNOWN status
   * @returns A new DeviceStatus instance with UNKNOWN status
   */
  static unknown(): DeviceStatus {
    return new DeviceStatus(DeviceStatus.UNKNOWN);
  }

  /**
   * Validates that the device status is one of the allowed statuses
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('Device status cannot be empty');
    }

    if (!DeviceStatus.VALID_STATUSES.includes(this.value)) {
      throw new Error(`Invalid device status: ${this.value}. Must be one of: ${DeviceStatus.VALID_STATUSES.join(', ')}`);
    }
  }

  /**
   * Returns the string representation of the device status
   * @returns The device status as a string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks if this DeviceStatus is equal to another DeviceStatus
   * @param other The other DeviceStatus to compare with
   * @returns True if the device statuses are equal, false otherwise
   */
  equals(other: DeviceStatus): boolean {
    return this.value === other.value;
  }

  /**
   * Checks if the device is online
   * @returns True if the device is online, false otherwise
   */
  isOnline(): boolean {
    return this.value === DeviceStatus.ONLINE;
  }

  /**
   * Checks if the device is offline
   * @returns True if the device is offline, false otherwise
   */
  isOffline(): boolean {
    return this.value === DeviceStatus.OFFLINE;
  }

  /**
   * Checks if the device is in maintenance mode
   * @returns True if the device is in maintenance mode, false otherwise
   */
  isInMaintenance(): boolean {
    return this.value === DeviceStatus.MAINTENANCE;
  }

  /**
   * Checks if the device is being provisioned
   * @returns True if the device is being provisioned, false otherwise
   */
  isProvisioning(): boolean {
    return this.value === DeviceStatus.PROVISIONING;
  }

  /**
   * Checks if the device is in an error state
   * @returns True if the device is in an error state, false otherwise
   */
  isError(): boolean {
    return this.value === DeviceStatus.ERROR;
  }

  /**
   * Checks if the device status is unknown
   * @returns True if the device status is unknown, false otherwise
   */
  isUnknown(): boolean {
    return this.value === DeviceStatus.UNKNOWN;
  }

  /**
   * Checks if the device is available for operations
   * @returns True if the device is available, false otherwise
   */
  isAvailable(): boolean {
    return this.value === DeviceStatus.ONLINE;
  }

  /**
   * Checks if the device is unavailable for operations
   * @returns True if the device is unavailable, false otherwise
   */
  isUnavailable(): boolean {
    return [
      DeviceStatus.OFFLINE,
      DeviceStatus.MAINTENANCE,
      DeviceStatus.ERROR,
      DeviceStatus.UNKNOWN
    ].includes(this.value);
  }

  /**
   * Gets all valid device statuses
   * @returns Array of all valid device statuses
   */
  static getAllStatuses(): string[] {
    return [...DeviceStatus.VALID_STATUSES];
  }
}

export { DeviceStatus };