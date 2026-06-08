export class NotificationError {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationError {
    if (!value?.trim()) throw new Error('NotificationError cannot be empty');
    if (value.length > 2000) throw new Error('NotificationError cannot exceed 2000 characters');
    return new NotificationError(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationError): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
