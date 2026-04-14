/**
 * Base domain exception class
 * All domain-specific exceptions should extend this class
 */
export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}