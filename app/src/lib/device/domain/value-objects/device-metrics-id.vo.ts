import {ValueObject} from '../../../shared/domain/base.value-object';
import {v4 as uuidv4} from 'uuid';

export interface DeviceMetricsIdProps {
  value: string;
}

/**
 * Value object representing a unique identifier for device metrics
 */
export class DeviceMetricsId extends ValueObject<DeviceMetricsIdProps> {
  private constructor(props: DeviceMetricsIdProps) {
    super(props);
  }

  /**
   * Creates a new DeviceMetricsId with a random UUID
   */
  static create(): DeviceMetricsId {
    return new DeviceMetricsId({ value: uuidv4() });
  }

  /**
   * Creates a DeviceMetricsId from a string
   * @param value The ID value
   */
  static fromString(value: string): DeviceMetricsId {
    if (!value) {
      throw new Error('DeviceMetricsId cannot be empty');
    }
    return new DeviceMetricsId({ value });
  }

  get value(): string {
    return this.props.value;
  }

  getValue(): string {
    return this.props.value;
  }

  toJSON(): DeviceMetricsIdProps {
    return this.props;
  }
}