import { TenantScopedEntity } from '@iotpilot/core/shared/domain/entities/tenant-scoped.entity';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { NotificationRecordId } from '../value-objects/notification-record-id.vo';
import { NotificationDeliveryStatus } from '../value-objects/notification-delivery-status.vo';
import { NotificationRecipient } from '../value-objects/notification-recipient.vo';
import { NotificationSubject } from '../value-objects/notification-subject.vo';
import { NotificationBody } from '../value-objects/notification-body.vo';
import { NotificationAttemptCount } from '../value-objects/notification-attempt-count.vo';
import { NotificationMaxAttempts } from '../value-objects/notification-max-attempts.vo';
import { NotificationError } from '../value-objects/notification-error.vo';
import { SourceEventId } from '../value-objects/source-event-id.vo';
import { SourceEntityId } from '../value-objects/source-entity-id.vo';
import { NotificationAlreadyTerminalException } from '../exceptions/notification-already-terminal.exception';

export interface NotificationRecordProps {
  id: NotificationRecordId;
  customerId: CustomerId;
  userId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject: NotificationSubject;
  body: NotificationBody;
  status: NotificationDeliveryStatus;
  attemptCount: NotificationAttemptCount;
  maxAttempts: NotificationMaxAttempts;
  sourceEventId: SourceEventId;
  sourceEntityId: SourceEntityId | null;
  errorMessage: NotificationError | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class NotificationRecordEntity extends TenantScopedEntity<NotificationRecordId> {
  private constructor(private props: NotificationRecordProps) {
    super(props.id, props.customerId);
  }

  static create(props: Omit<NotificationRecordProps, 'status' | 'attemptCount' | 'sentAt' | 'deliveredAt' | 'failedAt' | 'errorMessage' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
    maxAttempts?: NotificationMaxAttempts;
    scheduledAt?: Date | null;
  }): NotificationRecordEntity {
    const now = new Date();
    return new NotificationRecordEntity({
      ...props,
      maxAttempts: props.maxAttempts ?? NotificationMaxAttempts.default(),
      scheduledAt: props.scheduledAt ?? null,
      status: NotificationDeliveryStatus.PENDING,
      attemptCount: NotificationAttemptCount.zero(),
      errorMessage: null,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static reconstitute(props: NotificationRecordProps): NotificationRecordEntity {
    return new NotificationRecordEntity(props);
  }

  getId(): NotificationRecordId { return this.props.id; }
  getCustomerId(): CustomerId { return this.props.customerId; }

  get userId(): string | null { return this.props.userId; }
  get type(): NotificationType { return this.props.type; }
  get channel(): NotificationChannel { return this.props.channel; }
  get recipient(): NotificationRecipient { return this.props.recipient; }
  get subject(): NotificationSubject { return this.props.subject; }
  get body(): NotificationBody { return this.props.body; }
  get status(): NotificationDeliveryStatus { return this.props.status; }
  get attemptCount(): NotificationAttemptCount { return this.props.attemptCount; }
  get maxAttempts(): NotificationMaxAttempts { return this.props.maxAttempts; }
  get sourceEventId(): SourceEventId { return this.props.sourceEventId; }
  get sourceEntityId(): SourceEntityId | null { return this.props.sourceEntityId; }
  get errorMessage(): NotificationError | null { return this.props.errorMessage; }
  get scheduledAt(): Date | null { return this.props.scheduledAt; }
  get sentAt(): Date | null { return this.props.sentAt; }
  get deliveredAt(): Date | null { return this.props.deliveredAt; }
  get failedAt(): Date | null { return this.props.failedAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  markAsSending(): void {
    if (this.props.status.isTerminal()) {
      throw new NotificationAlreadyTerminalException(this.props.id.getValue(), this.props.status.value);
    }
    const now = new Date();
    this.props.status = NotificationDeliveryStatus.SENDING;
    this.props.attemptCount = this.props.attemptCount.increment();
    if (!this.props.sentAt) this.props.sentAt = now;
    this.props.updatedAt = now;
  }

  markAsDelivered(): void {
    if (!this.props.status.isSending()) {
      throw new NotificationAlreadyTerminalException(this.props.id.getValue(), this.props.status.value);
    }
    const now = new Date();
    this.props.status = NotificationDeliveryStatus.DELIVERED;
    this.props.deliveredAt = now;
    this.props.updatedAt = now;
  }

  markAsFailed(error: NotificationError): void {
    if (!this.props.status.isSending()) {
      throw new NotificationAlreadyTerminalException(this.props.id.getValue(), this.props.status.value);
    }
    const now = new Date();
    this.props.errorMessage = error;
    if (this.props.attemptCount.isExhausted(this.props.maxAttempts)) {
      this.props.status = NotificationDeliveryStatus.DEAD;
      this.props.failedAt = now;
    } else {
      this.props.status = NotificationDeliveryStatus.FAILED;
    }
    this.props.updatedAt = now;
  }

  resetForRetry(): void {
    if (!this.props.status.isRetryable()) {
      throw new NotificationAlreadyTerminalException(this.props.id.getValue(), this.props.status.value);
    }
    this.props.status = NotificationDeliveryStatus.PENDING;
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (!this.props.status.isPending()) {
      throw new NotificationAlreadyTerminalException(this.props.id.getValue(), this.props.status.value);
    }
    this.props.status = NotificationDeliveryStatus.CANCELLED;
    this.props.updatedAt = new Date();
  }
}
