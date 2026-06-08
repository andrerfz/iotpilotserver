import { TenantScopedEntity } from '@iotpilot/core/shared/domain/entities/tenant-scoped.entity';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { NotificationChannel } from '@iotpilot/core/shared/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@iotpilot/core/shared/domain/value-objects/notification-type.vo';
import { NotificationPreferenceId } from '../value-objects/notification-preference-id.vo';
import { NotificationRecipient } from '../value-objects/notification-recipient.vo';

export interface NotificationPreferenceProps {
  id: NotificationPreferenceId;
  customerId: CustomerId;
  userId: string;
  channel: NotificationChannel;
  notificationType: NotificationType;
  enabled: boolean;
  destination: NotificationRecipient | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class NotificationPreferenceEntity extends TenantScopedEntity<NotificationPreferenceId> {
  private constructor(private props: NotificationPreferenceProps) {
    super(props.id, props.customerId);
  }

  static create(props: Omit<NotificationPreferenceProps, 'createdAt' | 'updatedAt' | 'deletedAt'>): NotificationPreferenceEntity {
    const now = new Date();
    return new NotificationPreferenceEntity({ ...props, createdAt: now, updatedAt: now, deletedAt: null });
  }

  static reconstitute(props: NotificationPreferenceProps): NotificationPreferenceEntity {
    return new NotificationPreferenceEntity(props);
  }

  getId(): NotificationPreferenceId { return this.props.id; }
  getCustomerId(): CustomerId { return this.props.customerId; }

  get userId(): string { return this.props.userId; }
  get channel(): NotificationChannel { return this.props.channel; }
  get notificationType(): NotificationType { return this.props.notificationType; }
  get enabled(): boolean { return this.props.enabled; }
  get destination(): NotificationRecipient | null { return this.props.destination; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  update(enabled: boolean, destination: NotificationRecipient | null): void {
    this.props.enabled = enabled;
    this.props.destination = destination;
    this.props.updatedAt = new Date();
  }
}
