import {ValueObject} from '../base.value-object';

export interface NotificationTypeProps {
  value: string;
}

export class NotificationType extends ValueObject<NotificationTypeProps> {
  private constructor(props: NotificationTypeProps) {
    super(props);
  }

  public static readonly ALERT_TRIGGERED = new NotificationType({ value: 'ALERT_TRIGGERED' });
  public static readonly ALERT_RESOLVED = new NotificationType({ value: 'ALERT_RESOLVED' });
  public static readonly DEVICE_OFFLINE = new NotificationType({ value: 'DEVICE_OFFLINE' });
  public static readonly DEVICE_ONLINE = new NotificationType({ value: 'DEVICE_ONLINE' });
  public static readonly SYSTEM_MAINTENANCE = new NotificationType({ value: 'SYSTEM_MAINTENANCE' });
  public static readonly USER_INVITATION = new NotificationType({ value: 'USER_INVITATION' });
  public static readonly CUSTOMER_CREATED = new NotificationType({ value: 'CUSTOMER_CREATED' });
  public static readonly USER_LOGIN_ALERT = new NotificationType({ value: 'USER_LOGIN_ALERT' });

  get value(): string {
    return this.props.value;
  }

  public static fromString(value: string): NotificationType {
    const type = Object.values(NotificationType).find(t => t.value === value);
    if (!type) {
      throw new Error(`Invalid notification type: ${value}`);
    }
    return type;
  }

  toJSON(): NotificationTypeProps {
    return this.props;
  }
}
