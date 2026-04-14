import {ValueObject} from '@iotpilot/core/shared/domain/base.value-object';
import {v4 as uuidv4} from 'uuid';

export interface AlertIdProps {
  value: string;
}

export class AlertId extends ValueObject<AlertIdProps> {
  private constructor(props: AlertIdProps) {
    super(props);
  }

  public static create(): AlertId {
    return new AlertId({ value: uuidv4() });
  }

  public static generate(): AlertId {
    return AlertId.create();
  }

  public static fromString(value: string): AlertId {
    return new AlertId({ value });
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.props.value;
  }

  toJSON(): AlertIdProps {
    return this.props;
  }
}