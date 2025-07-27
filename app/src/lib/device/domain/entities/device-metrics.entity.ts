import {DeviceMetricsId} from '../value-objects/device-metrics-id.vo';
import {DeviceId} from '../value-objects/device-id.vo';
import {CustomerId} from '../../../shared/domain/value-objects/customer-id.vo';
import {TenantScopedEntity} from '../../../shared/domain/entities/tenant-scoped.entity';

export interface DeviceMetricsProps {
  id: DeviceMetricsId;
  deviceId: DeviceId;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
  loadAverage: number[];
  temperature?: number;
  collectedAt: Date;
  createdAt: Date;
}

export class DeviceMetrics extends TenantScopedEntity<DeviceMetricsId> {
  constructor(
    id: DeviceMetricsId,
    customerId: CustomerId,
    private props: DeviceMetricsProps
  ) {
    super(id, customerId);
  }

  static create(props: Omit<DeviceMetricsProps, 'id' | 'createdAt'> & { customerId: CustomerId }): DeviceMetrics {
    const id = DeviceMetricsId.create();
    const now = new Date();
    const entityProps: DeviceMetricsProps = {
      ...props,
      id,
      createdAt: now,
    };
    return new DeviceMetrics(id, props.customerId, entityProps);
  }

  getId(): DeviceMetricsId {
    return this._entityId;
  }

  get deviceId(): DeviceId {
    return this.props.deviceId;
  }

  get cpuUsage(): number {
    return this.props.cpuUsage;
  }

  get memoryUsage(): number {
    return this.props.memoryUsage;
  }

  get diskUsage(): number {
    return this.props.diskUsage;
  }

  get networkRx(): number {
    return this.props.networkRx;
  }

  get networkTx(): number {
    return this.props.networkTx;
  }

  get uptime(): number {
    return this.props.uptime;
  }

  get loadAverage(): number[] {
    return this.props.loadAverage;
  }

  get temperature(): number | undefined {
    return this.props.temperature;
  }

  get collectedAt(): Date {
    return this.props.collectedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}