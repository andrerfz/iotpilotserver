import {ValueObject} from '../../../shared/domain/base.value-object';

export type StatusType = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';

export interface AlertStatusProps {
  value: string;
}

export class AlertStatus extends ValueObject<AlertStatusProps> {
  private constructor(props: AlertStatusProps) {
    super(props);
  }

  public static readonly ACTIVE = new AlertStatus({ value: 'ACTIVE' });
  public static readonly ACKNOWLEDGED = new AlertStatus({ value: 'ACKNOWLEDGED' });
  public static readonly RESOLVED = new AlertStatus({ value: 'RESOLVED' });
  public static readonly SUPPRESSED = new AlertStatus({ value: 'SUPPRESSED' });

  get value(): string {
    return this.props.value;
  }

  public static fromString(value: string): AlertStatus {
    const status = Object.values(AlertStatus).find(s => s.value === value);
    if (!status) {
      throw new Error(`Invalid alert status: ${value}`);
    }
    return status;
  }

  public static create(value: string): AlertStatus {
    return AlertStatus.fromString(value);
  }

  getValue(): string {
    return this.props.value;
  }

  isActive(): boolean {
    return this.props.value === 'ACTIVE';
  }

  isAcknowledged(): boolean {
    return this.props.value === 'ACKNOWLEDGED';
  }

  isResolved(): boolean {
    return this.props.value === 'RESOLVED';
  }

  isSuppressed(): boolean {
    return this.props.value === 'SUPPRESSED';
  }

  toJSON(): AlertStatusProps {
    return this.props;
  }
}