export class NotificationRecipient {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationRecipient {
    if (!value?.trim()) throw new Error('NotificationRecipient cannot be empty');
    if (value.length > 500) throw new Error('NotificationRecipient cannot exceed 500 characters');
    return new NotificationRecipient(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationRecipient): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
