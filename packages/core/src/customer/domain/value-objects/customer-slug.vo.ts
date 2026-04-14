import {ValueObject} from '@iotpilot/core/shared/domain/base.value-object';

export interface CustomerSlugData {
  value: string;
}

export class CustomerSlug extends ValueObject<CustomerSlugData> {
  private constructor(value: string) {
    super({ value });
    this.validate();
  }

  static create(value: string): CustomerSlug {
    return new CustomerSlug(value);
  }

  /**
   * Create a slug from a customer name
   * @param name The customer name to convert to a slug
   * @returns A CustomerSlug value object
   */
  static createFromName(name: string): CustomerSlug {
    // Convert to lowercase, replace spaces with hyphens, and remove special characters
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-') // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens

    return new CustomerSlug(slug || 'customer'); // Fallback to 'customer' if slug is empty
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CustomerSlug): boolean {
    if (!(other instanceof CustomerSlug)) {
      return false;
    }
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }

  toJSON(): CustomerSlugData {
    return { value: this.value };
  }

  private validate(): void {
    if (!this.props.value || this.props.value.trim().length === 0) {
      throw new Error('CustomerSlug cannot be empty');
    }

    if (this.props.value.length > 100) {
      throw new Error('CustomerSlug cannot be longer than 100 characters');
    }

    // Slug should only contain lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/.test(this.props.value)) {
      throw new Error('CustomerSlug can only contain lowercase letters, numbers, and hyphens');
    }
  }
}
