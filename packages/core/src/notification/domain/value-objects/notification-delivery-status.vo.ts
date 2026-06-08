export type NotificationDeliveryStatusValue =
  | 'PENDING'
  | 'SENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'DEAD'
  | 'CANCELLED';

export class NotificationDeliveryStatus {
  private constructor(readonly value: NotificationDeliveryStatusValue) {}

  static readonly PENDING = new NotificationDeliveryStatus('PENDING');
  static readonly SENDING = new NotificationDeliveryStatus('SENDING');
  static readonly DELIVERED = new NotificationDeliveryStatus('DELIVERED');
  static readonly FAILED = new NotificationDeliveryStatus('FAILED');
  static readonly DEAD = new NotificationDeliveryStatus('DEAD');
  static readonly CANCELLED = new NotificationDeliveryStatus('CANCELLED');

  static create(value: string): NotificationDeliveryStatus {
    const valid: NotificationDeliveryStatusValue[] = ['PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'DEAD', 'CANCELLED'];
    if (!valid.includes(value as NotificationDeliveryStatusValue)) {
      throw new Error(`Invalid NotificationDeliveryStatus: ${value}`);
    }
    return new NotificationDeliveryStatus(value as NotificationDeliveryStatusValue);
  }

  isPending(): boolean { return this.value === 'PENDING'; }
  isSending(): boolean { return this.value === 'SENDING'; }
  isDelivered(): boolean { return this.value === 'DELIVERED'; }
  isFailed(): boolean { return this.value === 'FAILED'; }
  isDead(): boolean { return this.value === 'DEAD'; }
  isCancelled(): boolean { return this.value === 'CANCELLED'; }

  isTerminal(): boolean {
    return this.value === 'DELIVERED' || this.value === 'DEAD' || this.value === 'CANCELLED';
  }

  isRetryable(): boolean {
    return this.value === 'FAILED' || this.value === 'DEAD';
  }

  equals(other: NotificationDeliveryStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
