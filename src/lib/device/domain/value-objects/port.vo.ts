/**
 * Port Value Object
 * 
 * Represents a network port for a device in the system.
 * Ensures the port number is valid and provides immutability.
 */
class Port {
  // Common port numbers
  static readonly SSH = 22;
  static readonly HTTP = 80;
  static readonly HTTPS = 443;
  static readonly MQTT = 1883;
  static readonly MQTT_SECURE = 8883;
  static readonly TELNET = 23;
  static readonly FTP = 21;
  static readonly SFTP = 22; // Same as SSH
  static readonly SNMP = 161;

  // Port ranges
  static readonly MIN_PORT = 1;
  static readonly MAX_PORT = 65535;
  static readonly WELL_KNOWN_PORTS_MAX = 1023;
  static readonly REGISTERED_PORTS_MIN = 1024;
  static readonly REGISTERED_PORTS_MAX = 49151;
  static readonly DYNAMIC_PORTS_MIN = 49152;
  static readonly DYNAMIC_PORTS_MAX = 65535;

  private constructor(private readonly value: number) {
    this.validate();
  }

  /**
   * Factory method to create a new Port
   * @param port The port number
   * @returns A new Port instance
   * @throws Error if the port number is invalid
   */
  static create(port: number | string): Port {
    const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;
    return new Port(portNumber);
  }

  /**
   * Creates a Port with the standard SSH port (22)
   * @returns A new Port instance with the SSH port
   */
  static ssh(): Port {
    return new Port(Port.SSH);
  }

  /**
   * Creates a Port with the standard HTTP port (80)
   * @returns A new Port instance with the HTTP port
   */
  static http(): Port {
    return new Port(Port.HTTP);
  }

  /**
   * Creates a Port with the standard HTTPS port (443)
   * @returns A new Port instance with the HTTPS port
   */
  static https(): Port {
    return new Port(Port.HTTPS);
  }

  /**
   * Creates a Port with the standard MQTT port (1883)
   * @returns A new Port instance with the MQTT port
   */
  static mqtt(): Port {
    return new Port(Port.MQTT);
  }

  /**
   * Validates that the port number is within the valid range
   * @throws Error if validation fails
   */
  private validate(): void {
    if (isNaN(this.value)) {
      throw new Error('Port number must be a valid number');
    }

    if (!Number.isInteger(this.value)) {
      throw new Error('Port number must be an integer');
    }

    if (this.value < Port.MIN_PORT || this.value > Port.MAX_PORT) {
      throw new Error(`Port number must be between ${Port.MIN_PORT} and ${Port.MAX_PORT}`);
    }
  }

  /**
   * Returns the port number
   * @returns The port number as a number
   */
  toNumber(): number {
    return this.value;
  }

  /**
   * Returns the string representation of the port number
   * @returns The port number as a string
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * Checks if this Port is equal to another Port
   * @param other The other Port to compare with
   * @returns True if the port numbers are equal, false otherwise
   */
  equals(other: Port): boolean {
    return this.value === other.toNumber();
  }

  /**
   * Checks if this port is a well-known port (0-1023)
   * @returns True if the port is a well-known port, false otherwise
   */
  isWellKnown(): boolean {
    return this.value <= Port.WELL_KNOWN_PORTS_MAX;
  }

  /**
   * Checks if this port is a registered port (1024-49151)
   * @returns True if the port is a registered port, false otherwise
   */
  isRegistered(): boolean {
    return this.value >= Port.REGISTERED_PORTS_MIN && this.value <= Port.REGISTERED_PORTS_MAX;
  }

  /**
   * Checks if this port is a dynamic/private port (49152-65535)
   * @returns True if the port is a dynamic/private port, false otherwise
   */
  isDynamic(): boolean {
    return this.value >= Port.DYNAMIC_PORTS_MIN;
  }

  /**
   * Checks if this port is the standard SSH port
   * @returns True if the port is the SSH port, false otherwise
   */
  isSSH(): boolean {
    return this.value === Port.SSH;
  }

  /**
   * Checks if this port is the standard HTTP port
   * @returns True if the port is the HTTP port, false otherwise
   */
  isHTTP(): boolean {
    return this.value === Port.HTTP;
  }

  /**
   * Checks if this port is the standard HTTPS port
   * @returns True if the port is the HTTPS port, false otherwise
   */
  isHTTPS(): boolean {
    return this.value === Port.HTTPS;
  }

  /**
   * Checks if this port is the standard MQTT port
   * @returns True if the port is the MQTT port, false otherwise
   */
  isMQTT(): boolean {
    return this.value === Port.MQTT;
  }

  /**
   * Checks if this port is the standard secure MQTT port
   * @returns True if the port is the secure MQTT port, false otherwise
   */
  isMQTTSecure(): boolean {
    return this.value === Port.MQTT_SECURE;
  }
}

export { Port };