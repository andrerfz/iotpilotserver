export class NotificationMaxAttempts {
  static readonly DEFAULT = 3;
  static readonly MIN = 1;
  static readonly MAX = 10;

  private constructor(private readonly value: number) {}

  static create(value: number): NotificationMaxAttempts {
    if (!Number.isInteger(value) || value < NotificationMaxAttempts.MIN || value > NotificationMaxAttempts.MAX) {
      throw new Error(`NotificationMaxAttempts must be an integer between ${NotificationMaxAttempts.MIN} and ${NotificationMaxAttempts.MAX}`);
    }
    return new NotificationMaxAttempts(value);
  }

  static default(): NotificationMaxAttempts {
    return new NotificationMaxAttempts(NotificationMaxAttempts.DEFAULT);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: NotificationMaxAttempts): boolean {
    return this.value === other.value;
  }
}
