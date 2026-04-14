import { v4 as uuidv4 } from 'uuid';

export class NotificationPreferenceId {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationPreferenceId {
    if (!value?.trim()) throw new Error('NotificationPreferenceId cannot be empty');
    return new NotificationPreferenceId(value);
  }

  static generate(): NotificationPreferenceId {
    return new NotificationPreferenceId(uuidv4());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationPreferenceId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
