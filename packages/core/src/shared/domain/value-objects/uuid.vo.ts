import {ValueObject} from '../base.value-object';
import {CryptoService} from '../interfaces/crypto-service.interface';

class UuidValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UuidValidationError';
  }
}

export interface UuidData {
  value: string;
}

/**
 * UUID Value Object
 * Represents a universally unique identifier (UUID) following RFC 4122
 * Provides validation and generation capabilities
 */
export class Uuid extends ValueObject<UuidData> {
  private constructor(value: string) {
    super({ value });
  }

  /**
   * Creates a UUID from a string value
   * Validates that the string is a valid UUID format (RFC 4122)
   * @param value The UUID string to validate and create from
   * @returns A new Uuid instance
   * @throws DomainException if the value is not a valid UUID
   */
  static create(value: string): Uuid {
    if (!value || value.trim().length === 0) {
      throw new UuidValidationError('UUID cannot be empty');
    }

    const trimmedValue = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedValue)) {
      throw new UuidValidationError(`Invalid UUID format: ${trimmedValue}`);
    }

    return new Uuid(trimmedValue);
  }

  /**
   * Generates a new random UUID (v4)
   * @param cryptoService The crypto service to use for generation
   * @returns A new Uuid instance with a randomly generated UUID
   * @throws UuidValidationError if crypto service is not available
   */
  static random(cryptoService: CryptoService): Uuid {
    try {
      return new Uuid(cryptoService.randomUUID());
    } catch (error) {
      throw new UuidValidationError(
        error instanceof Error 
          ? `Failed to generate UUID: ${error.message}`
          : 'Failed to generate UUID: crypto service unavailable'
      );
    }
  }

  /**
   * Creates a UUID from a string (alias for create)
   * @param value The UUID string to validate and create from
   * @returns A new Uuid instance
   */
  static fromString(value: string): Uuid {
    return Uuid.create(value);
  }

  /**
   * Gets the UUID string value
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Gets the UUID string value (alias for value getter)
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Checks if this UUID equals another UUID
   */
  equals(other: Uuid): boolean {
    return this.value === other.value;
  }

  /**
   * Converts the UUID to JSON representation
   */
  toJSON(): UuidData {
    return { value: this.value };
  }

  /**
   * Returns the UUID string representation
   */
  toString(): string {
    return this.value;
  }
}

