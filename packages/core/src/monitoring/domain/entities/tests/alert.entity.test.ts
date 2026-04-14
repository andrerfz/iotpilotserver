import {Alert} from '../alert.entity';
import {AlertId} from '../../value-objects/alert-id.vo';
import {AlertSeverity} from '../../value-objects/alert-severity.vo';
import {AlertStatus} from '../../value-objects/alert-status.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../../value-objects/threshold-id.vo';
import {MetricValue} from '../../value-objects/metric-value.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';

const validCustomerId = 'c1234567890123456789012345';

describe('Alert Entity', () => {
  const mockAlertId = AlertId.fromString('alert-123');
  const mockDeviceId = DeviceId.create('device-123');
  const mockCustomerId = CustomerId.create(validCustomerId);
  const mockThresholdId = ThresholdId.fromString('threshold-123');
  const mockMetricValue = MetricValue.create(85.5, 'percentage');
  const mockUserId = UserId.create('user-123');

  describe('create', () => {
    it('should create a valid alert', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACTIVE'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date('2024-01-01T10:00:00Z')
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBe(mockAlertId);
      expect(alert.title).toBe('High CPU Usage');
      expect(alert.message).toBe('CPU usage exceeded 80%');
      expect(alert.deviceId).toBe(mockDeviceId);
      expect(alert.getTenantId()).toBe(mockCustomerId);
      expect(alert.isActive()).toBe(true);
      expect(alert.status.isAcknowledged()).toBe(false);
      expect(alert.isResolved()).toBe(false);
    });

  });

  describe('acknowledge', () => {
    it('should acknowledge an active alert', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACTIVE'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date()
      );

      alert.acknowledge(mockUserId);

      expect(alert.status.isAcknowledged()).toBe(true);
      expect(alert.acknowledgedBy).toStrictEqual(mockUserId);
      expect(alert.acknowledgedAt).toBeDefined();
    });

    it('should allow acknowledge to update status when called on resolved alert', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('RESOLVED'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date(),
        undefined,
        undefined,
        new Date(),
        mockUserId
      );

      alert.acknowledge(mockUserId);
      expect(alert.status.isAcknowledged()).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should resolve an acknowledged alert', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACKNOWLEDGED'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date(),
        new Date(),
        mockUserId
      );

      alert.resolve(mockUserId);

      expect(alert.isResolved()).toBe(true);
      expect(alert.resolvedBy).toStrictEqual(mockUserId);
      expect(alert.resolvedAt).toBeDefined();
    });

    it('should resolve an active alert directly', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACTIVE'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date()
      );

      alert.resolve(mockUserId);

      expect(alert.isResolved()).toBe(true);
      expect(alert.resolvedBy).toStrictEqual(mockUserId);
      expect(alert.resolvedAt).toBeDefined();
    });
  });

  describe('escalate', () => {
    it('should escalate alert severity when higher', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACTIVE'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date()
      );

      const newSeverity = AlertSeverity.create('CRITICAL');
      alert.escalate(newSeverity);

      expect(alert.severity).toBe(newSeverity);
    });
  });

  describe('tenant isolation', () => {
    it('should be tenant-scoped', () => {
      const alert = Alert.create(
        mockAlertId,
        'High CPU Usage',
        'CPU usage exceeded 80%',
        AlertSeverity.create('HIGH'),
        AlertStatus.create('ACTIVE'),
        mockDeviceId,
        mockCustomerId,
        'cpu_usage',
        mockMetricValue,
        75.0,
        mockThresholdId,
        new Date()
      );

      expect(alert.getTenantId()).toBe(mockCustomerId);
      expect(alert.belongsToTenant(mockCustomerId)).toBe(true);
      expect(alert.belongsToTenant(CustomerId.create('cothercustomer00000000000001'))).toBe(false);
    });
  });
});