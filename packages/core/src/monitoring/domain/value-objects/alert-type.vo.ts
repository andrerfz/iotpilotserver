import {ValueObject} from '../../../shared/domain/base.value-object';

export interface AlertTypeProps {
  value: string;
}

export class AlertType extends ValueObject<AlertTypeProps> {
  private constructor(props: AlertTypeProps) {
    super(props);
  }

  public static readonly CPU_USAGE = new AlertType({ value: 'CPU_USAGE' });
  public static readonly MEMORY_USAGE = new AlertType({ value: 'MEMORY_USAGE' });
  public static readonly DISK_USAGE = new AlertType({ value: 'DISK_USAGE' });
  public static readonly NETWORK_ERROR = new AlertType({ value: 'NETWORK_ERROR' });
  public static readonly DEVICE_OFFLINE = new AlertType({ value: 'DEVICE_OFFLINE' });
  public static readonly SSH_CONNECTION_FAILED = new AlertType({ value: 'SSH_CONNECTION_FAILED' });

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.props.value;
  }

  public static fromString(value: string): AlertType {
    const alertType = Object.values(AlertType).find(type => type.value === value);
    if (!alertType) {
      throw new Error(`Invalid alert type: ${value}`);
    }
    return alertType;
  }

  public toJSON(): AlertTypeProps {
    return this.props;
  }
}
