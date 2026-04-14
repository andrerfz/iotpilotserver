import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AcknowledgeAlertHandler} from './acknowledge-alert.handler';
import {AcknowledgeAlertCommand} from './acknowledge-alert.command';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {AlertStatus} from '@iotpilot/core/monitoring/domain/value-objects/alert-status.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {MetricValue} from '@iotpilot/core/monitoring/domain/value-objects/metric-value.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';

// Mock repository
class MockAlertRepository {
  findById = vi.fn();
  save = vi.fn();
  findByDeviceId = vi.fn();
  findBySeverity = vi.fn();
  findByStatus = vi.fn();
  findAll = vi.fn();
  delete = vi.fn();
}

// Mock event bus
class MockEventBus {
  publish = vi.fn();
}

const validCustomerId = 'c1234567890123456789012345';

describe('AcknowledgeAlertHandler', () => {
  let handler: AcknowledgeAlertHandler;
  let mockRepository: MockAlertRepository;
  let mockEventBus: MockEventBus;
  let tenantContext: TenantContextImpl;

  beforeEach(() => {
    mockRepository = new MockAlertRepository();
    mockEventBus = new MockEventBus();
    handler = new AcknowledgeAlertHandler(mockRepository as any, mockEventBus as any);
    tenantContext = TenantContextImpl.create(CustomerId.create(validCustomerId));
  });

  describe('handle', () => {
    it('should acknowledge an alert successfully', async () => {
      // Arrange
      const alertId = AlertId.fromString('alert-123');
      const userId = UserId.create('user-123');
      const notes = 'Acknowledged by admin';

      const alert = Alert.create(
        alertId,
        'High CPU Usage',
        'CPU usage exceeded 90%',
        AlertSeverity.create('MEDIUM'),
        AlertStatus.create('ACTIVE'),
        DeviceId.create('device-123'),
        CustomerId.create(validCustomerId),
        'cpu_usage',
        MetricValue.create(95.0, 'percent'),
        90.0,
        ThresholdId.create('cpu_threshold'),
        new Date()
      );

      mockRepository.findById.mockResolvedValue(alert);
      mockRepository.save.mockResolvedValue(alert);

      const command = AcknowledgeAlertCommand.create(
        alertId.getValue(),
        userId.getValue(),
        validCustomerId,
        tenantContext
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'alert-123' }),
        expect.any(Object)
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBe(alert);
      expect(result.status.getValue()).toBe('ACKNOWLEDGED');
    });

    it('should throw error when alert not found', async () => {
      // Arrange
      const alertId = AlertId.fromString('non-existent');
      const userId = UserId.create('user-123');

      mockRepository.findById.mockResolvedValue(null);

      const command = AcknowledgeAlertCommand.create(
        alertId.getValue(),
        userId.getValue(),
        validCustomerId,
        tenantContext
      );

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow('Alert with ID non-existent not found');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should not re-acknowledge already acknowledged alert', async () => {
      // Arrange
      const alertId = AlertId.fromString('alert-123');
      const userId = UserId.create('user-123');

      const alert = Alert.create(
        alertId,
        'High CPU Usage',
        'CPU usage exceeded 90%',
        AlertSeverity.create('MEDIUM'),
        AlertStatus.create('ACKNOWLEDGED'), // Already acknowledged
        DeviceId.create('device-123'),
        CustomerId.create(validCustomerId),
        'cpu_usage',
        MetricValue.create(95.0, 'percent'),
        90.0,
        ThresholdId.create('cpu_threshold'),
        new Date()
      );

      mockRepository.findById.mockResolvedValue(alert);

      const command = AcknowledgeAlertCommand.create(
        alertId.getValue(),
        userId.getValue(),
        validCustomerId,
        tenantContext
      );

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow(
        'Alert with ID alert-123 cannot be acknowledged because it is not active'
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should include notes when provided', async () => {
      // Arrange
      const alertId = AlertId.fromString('alert-123');
      const userId = UserId.create('user-123');
      const notes = 'False positive - system maintenance';

      const alert = Alert.create(
        alertId,
        'High CPU Usage',
        'CPU usage exceeded 90%',
        AlertSeverity.create('CRITICAL'),
        AlertStatus.create('ACTIVE'),
        DeviceId.create('device-123'),
        CustomerId.create(validCustomerId),
        'cpu_usage',
        MetricValue.create(95.0, 'percent'),
        90.0,
        ThresholdId.create('cpu_threshold'),
        new Date()
      );

      mockRepository.findById.mockResolvedValue(alert);
      mockRepository.save.mockResolvedValue(alert);

      const command = AcknowledgeAlertCommand.create(
        alertId.getValue(),
        userId.getValue(),
        validCustomerId,
        tenantContext
      );

      // Act
      await handler.handle(command);

      // Assert
      const savedAlert = mockRepository.save.mock.calls[0][0];
      expect(savedAlert).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should validate tenant access', async () => {
      // Arrange
      const alertId = AlertId.fromString('alert-123');
      const userId = UserId.create('user-123');
      const wrongTenantContext = TenantContextImpl.create(CustomerId.create('cwrongcustomer00000000000001'));

      const alert = Alert.create(
        alertId,
        'High CPU Usage',
        'CPU usage exceeded 90%',
        AlertSeverity.create('MEDIUM'),
        AlertStatus.create('ACTIVE'),
        DeviceId.create('device-123'),
        CustomerId.create(validCustomerId), // Different tenant
        'cpu_usage',
        MetricValue.create(95.0, 'percent'),
        90.0,
        ThresholdId.create('cpu_threshold'),
        new Date()
      );

      mockRepository.findById.mockResolvedValue(alert);

      // Act & Assert - command creation should fail due to tenant access violation
      expect(() => AcknowledgeAlertCommand.create(
        alertId.getValue(),
        userId.getValue(),
        validCustomerId, // customerId of the alert
        wrongTenantContext
      )).toThrow('does not have access to tenant');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});

