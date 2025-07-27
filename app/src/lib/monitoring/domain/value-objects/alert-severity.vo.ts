import {ValueObject} from '../../../shared/domain/base.value-object';

export type SeverityLevel = 'info' | 'warning' | 'error' | 'critical' | 'emergency';

export interface AlertSeverityProps {
  value: string;
  level: number;
}

export class AlertSeverity extends ValueObject<AlertSeverityProps> {
  private constructor(props: AlertSeverityProps) {
    super(props);
  }

  public static readonly LOW = new AlertSeverity({ value: 'LOW', level: 1 });
  public static readonly MEDIUM = new AlertSeverity({ value: 'MEDIUM', level: 2 });
  public static readonly HIGH = new AlertSeverity({ value: 'HIGH', level: 3 });
  public static readonly CRITICAL = new AlertSeverity({ value: 'CRITICAL', level: 4 });

  get value(): string {
    return this.props.value;
  }

  get level(): number {
    return this.props.level;
  }

  public static fromString(value: string): AlertSeverity {
    const severity = Object.values(AlertSeverity).find(s => s.value === value);
    if (!severity) {
      throw new Error(`Invalid alert severity: ${value}`);
    }
    return severity;
  }

  public static create(value: string): AlertSeverity {
    return AlertSeverity.fromString(value);
  }

  getValue(): string {
    return this.props.value;
  }

  isLow(): boolean {
    return this.props.value === 'LOW';
  }

  isMedium(): boolean {
    return this.props.value === 'MEDIUM';
  }

  isHigh(): boolean {
    return this.props.value === 'HIGH';
  }

  isCritical(): boolean {
    return this.props.value === 'CRITICAL';
  }

  isHigherThan(other: AlertSeverity): boolean {
    return this.props.level > other.level;
  }

  toJSON(): AlertSeverityProps {
    return this.props;
  }
}