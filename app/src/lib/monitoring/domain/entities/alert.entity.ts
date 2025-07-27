import {AlertId} from '../value-objects/alert-id.vo';
import {AlertType} from '../value-objects/alert-type.vo';
import {AlertSeverity} from '../value-objects/alert-severity.vo';
import {AlertStatus} from '../value-objects/alert-status.vo';
import {MetricValue} from '../value-objects/metric-value.vo';
import {ThresholdId} from '../value-objects/threshold-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserId} from '../../../user/domain/value-objects/user-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {TenantScopedEntity} from '@/lib/shared/domain/entities/tenant-scoped.entity';

export interface AlertEntityProps {
  id: AlertId;
  deviceId?: DeviceId; // Optional: system-level alerts may not have a device
  type?: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metricName?: string;
  metricValue?: MetricValue;
  thresholdValue?: number;
  thresholdId?: ThresholdId;
  notes?: string;
  metadata?: Record<string, any>;
  acknowledgedBy?: UserId;
  acknowledgedAt?: Date;
  resolvedBy?: UserId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AlertEntity extends TenantScopedEntity<AlertId> {
  constructor(
    id: AlertId,
    customerId: CustomerId,
    private props: AlertEntityProps
  ) {
    super(id, customerId);
  }

  static create(
    id: AlertId,
    title: string,
    message: string,
    severity: AlertSeverity,
    status: AlertStatus,
    deviceId: DeviceId | undefined,
    customerId: CustomerId,
    metricName?: string,
    metricValue?: MetricValue,
    thresholdValue?: number,
    thresholdId?: ThresholdId,
    createdAt?: Date,
    acknowledgedAt?: Date,
    acknowledgedBy?: UserId,
    resolvedAt?: Date,
    resolvedBy?: UserId,
    notes?: string,
    type?: AlertType,
    metadata?: Record<string, any>
  ): AlertEntity {
    const now = new Date();
    const entityProps: AlertEntityProps = {
      id,
      deviceId,
      title,
      message,
      severity,
      status,
      metricName,
      metricValue,
      thresholdValue,
      thresholdId,
      notes,
      type,
      metadata,
      acknowledgedBy,
      acknowledgedAt,
      resolvedBy,
      resolvedAt,
      createdAt: createdAt || now,
      updatedAt: now,
    };
    return new AlertEntity(id, customerId, entityProps);
  }

  get deviceId(): DeviceId | undefined {
    return this.props.deviceId;
  }

  get type(): AlertType | undefined {
    return this.props.type;
  }

  /**
   * Check if this is a device-specific alert
   */
  isDeviceAlert(): boolean {
    return this.props.deviceId !== undefined;
  }

  /**
   * Check if this is a system-level alert (no specific device)
   */
  isSystemAlert(): boolean {
    return this.props.deviceId === undefined;
  }

  get metricName(): string | undefined {
    return this.props.metricName;
  }

  get metricValue(): MetricValue | undefined {
    return this.props.metricValue;
  }

  get thresholdValue(): number | undefined {
    return this.props.thresholdValue;
  }

  get thresholdId(): ThresholdId | undefined {
    return this.props.thresholdId;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get resolvedBy(): UserId | undefined {
    return this.props.resolvedBy;
  }

  get severity(): AlertSeverity {
    return this.props.severity;
  }

  get status(): AlertStatus {
    return this.props.status;
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get acknowledgedBy(): UserId | undefined {
    return this.props.acknowledgedBy;
  }

  get acknowledgedAt(): Date | undefined {
    return this.props.acknowledgedAt;
  }

  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  getId(): AlertId {
    return this.props.id;
  }

  get timestamp(): Date {
    return this.props.createdAt;
  }

  getCustomerId(): CustomerId {
    if (!this.customerId) {
      throw new Error('Alert must have a customerId');
    }
    return this.customerId;
  }

  acknowledge(userId: UserId): void {
    this.props.status = AlertStatus.ACKNOWLEDGED;
    this.props.acknowledgedBy = userId;
    this.props.acknowledgedAt = new Date();
    this.props.updatedAt = new Date();
  }

  escalate(newSeverity: AlertSeverity): void {
    if (newSeverity.isHigherThan(this.props.severity)) {
      this.props.severity = newSeverity;
      this.props.updatedAt = new Date();
    }
  }

  resolve(userId?: UserId): void {
    this.props.status = AlertStatus.RESOLVED;
    this.props.resolvedAt = new Date();
    this.props.resolvedBy = userId;
    this.props.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.props.status.getValue() === 'ACTIVE';
  }

  isResolved(): boolean {
    return this.props.status.getValue() === 'RESOLVED';
  }

  update(props: Partial<Pick<AlertEntityProps, 'title' | 'message' | 'metadata'>>): void {
    if (props.title !== undefined) {
      this.props.title = props.title;
    }
    if (props.message !== undefined) {
      this.props.message = props.message;
    }
    if (props.metadata !== undefined) {
      this.props.metadata = props.metadata;
    }
    this.props.updatedAt = new Date();
  }
}

// Export as both Alert and AlertEntity for backwards compatibility
export { AlertEntity as Alert };