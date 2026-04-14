import { v4 as uuidv4 } from 'uuid';

export class NotificationRecordId {
  private constructor(private readonly value: string) {}

  static create(value: string): NotificationRecordId {
    if (!value?.trim()) throw new Error('NotificationRecordId cannot be empty');
    return new NotificationRecordId(value);
  }

  static generate(): NotificationRecordId {
    return new NotificationRecordId(uuidv4());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NotificationRecordId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
