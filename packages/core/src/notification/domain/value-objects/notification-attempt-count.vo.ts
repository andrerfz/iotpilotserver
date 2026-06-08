export class NotificationAttemptCount {
  private constructor(private readonly value: number) {}

  static create(value: number): NotificationAttemptCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('NotificationAttemptCount must be a non-negative integer');
    }
    return new NotificationAttemptCount(value);
  }

  static zero(): NotificationAttemptCount {
    return new NotificationAttemptCount(0);
  }

  getValue(): number {
    return this.value;
  }

  increment(): NotificationAttemptCount {
    return new NotificationAttemptCount(this.value + 1);
  }

  isExhausted(maxAttempts: { getValue(): number }): boolean {
    return this.value >= maxAttempts.getValue();
  }

  equals(other: NotificationAttemptCount): boolean {
    return this.value === other.value;
  }
}
