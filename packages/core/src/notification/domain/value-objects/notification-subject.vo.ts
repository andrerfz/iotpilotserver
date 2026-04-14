export class NotificationSubject {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationSubject {
    if (!value?.trim()) throw new Error('NotificationSubject cannot be empty');
    if (value.length > 200) throw new Error('NotificationSubject cannot exceed 200 characters');
    return new NotificationSubject(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationSubject): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
