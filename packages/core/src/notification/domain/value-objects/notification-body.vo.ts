export class NotificationBody {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationBody {
    if (!value?.trim()) throw new Error('NotificationBody cannot be empty');
    if (value.length > 10000) throw new Error('NotificationBody cannot exceed 10000 characters');
    return new NotificationBody(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationBody): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
