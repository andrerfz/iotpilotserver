import {ValueObject} from '../base.value-object';

export interface NotificationChannelProps {
  value: string;
}

export class NotificationChannel extends ValueObject<NotificationChannelProps> {
  private constructor(props: NotificationChannelProps) {
    super(props);
  }

  public static readonly EMAIL = new NotificationChannel({ value: 'EMAIL' });
  public static readonly SMS = new NotificationChannel({ value: 'SMS' });
  public static readonly WEBHOOK = new NotificationChannel({ value: 'WEBHOOK' });
  public static readonly SLACK = new NotificationChannel({ value: 'SLACK' });
  public static readonly TEAMS = new NotificationChannel({ value: 'TEAMS' });
  public static readonly PUSH = new NotificationChannel({ value: 'PUSH' });

  get value(): string {
    return this.props.value;
  }

  public static fromString(value: string): NotificationChannel {
    const channel = Object.values(NotificationChannel).find(c => c.value === value);
    if (!channel) {
      throw new Error(`Invalid notification channel: ${value}`);
    }
    return channel;
  }

  toJSON(): NotificationChannelProps {
    return this.props;
  }
}
