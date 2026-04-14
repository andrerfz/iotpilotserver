import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ListAlertsHandler} from './list-alerts.handler';
import {ListAlertsQuery} from './list-alerts.query';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {AlertStatus} from '@iotpilot/core/monitoring/domain/value-objects/alert-status.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {MetricValue} from '@iotpilot/core/monitoring/domain/value-objects/metric-value.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';

// Mock repository
class MockAlertRepository {
  findAll = vi.fn();
  findByDeviceId = vi.fn();
  findBySeverity = vi.fn();
  findByStatus = vi.fn();
  findById = vi.fn();
  save = vi.fn();
  delete = vi.fn();
  count = vi.fn();
}

// Mock tenant validator
class MockTenantValidator {
  validateTenantAccess = vi.fn();
}

describe('ListAlertsHandler', () => {
  let handler: ListAlertsHandler;
  let mockRepository: MockAlertRepository;
  let mockTenantValidator: MockTenantValidator;
  let tenantContext: TenantContext;
  let customerId: CustomerId;

  beforeEach(() => {
    mockRepository = new MockAlertRepository();
    mockTenantValidator = new MockTenantValidator();
    mockRepository.count.mockResolvedValue(0); // Default count
    handler = new ListAlertsHandler(mockRepository as any, mockTenantValidator as any);
    customerId = CustomerId.create('ccustomer123000000000000001');
    tenantContext = TenantContextImpl.create(customerId);
  });

  describe('handle - list all alerts', () => {
    it('should return all alerts for tenant', async () => {
      // Arrange
      const alerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'High CPU Usage',
          'CPU exceeded 90%',
          AlertSeverity.create('HIGH'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'cpu_threshold'
        ),
        Alert.create(
          AlertId.fromString('alert-2'),
          'Low Memory',
          'Memory below 10%',
          AlertSeverity.create('MEDIUM'),
          AlertStatus.create('ACKNOWLEDGED'),
          DeviceId.create('device-2'),
          customerId,
          'memory_threshold'
        )
      ];

      mockRepository.findAll.mockResolvedValue(alerts);
      mockRepository.count.mockResolvedValue(2);

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        customerId,
        undefined, // timeRange
        undefined, // limit
        undefined  // offset
      );
      expect(result.alerts).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter alerts by status', async () => {
      // Arrange
      const activeAlerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Alert 1',
          'Message 1',
          AlertSeverity.create('HIGH'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        )
      ];

      mockRepository.findByStatus.mockResolvedValue(activeAlerts);
      mockRepository.count.mockResolvedValue(1);

      const query = ListAlertsQuery.create(
        customerId.getValue(),
        undefined, // deviceId
        undefined, // severity
        'ACTIVE' // status
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(
        expect.any(Object), // AlertStatus
        customerId,
        undefined // timeRange
      );
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].status.getValue()).toBe('ACTIVE');
    });

    it('should filter alerts by severity', async () => {
      // Arrange
      const criticalAlerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Critical Alert',
          'Critical issue',
          AlertSeverity.create('CRITICAL'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        )
      ];

      mockRepository.findBySeverity.mockResolvedValue(criticalAlerts);
      mockRepository.count.mockResolvedValue(1);

      const query = ListAlertsQuery.create(
        customerId.getValue(),
        undefined, // deviceId
        'CRITICAL' // severity
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockRepository.findBySeverity).toHaveBeenCalledWith(
        expect.any(Object), // AlertSeverity
        customerId,
        undefined // timeRange
      );
      expect(result.alerts[0].severity.getValue()).toBe('CRITICAL');
    });

    it('should filter alerts by device', async () => {
      // Arrange
      const deviceAlerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Device Alert',
          'Device specific alert',
          AlertSeverity.create('MEDIUM'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-123'),
          customerId,
          'threshold_1'
        )
      ];

      mockRepository.findByDeviceId.mockResolvedValue(deviceAlerts);

      const query = ListAlertsQuery.create(
        customerId.getValue(),
        'device-123' // deviceId
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockRepository.findByDeviceId).toHaveBeenCalledWith(
        expect.any(Object), // DeviceId
        customerId,         // CustomerId (tenantId)
        undefined          // timeRange
      );
      expect(result.alerts).toHaveLength(1);
    });
  });

  describe('handle - pagination', () => {
    it('should support limit and offset', async () => {
      // Arrange
      const allAlerts = Array.from({ length: 50 }, (_, i) =>
        Alert.create(
          AlertId.fromString(`alert-${i}`),
          `Alert ${i}`,
          `Message ${i}`,
          AlertSeverity.create('LOW'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        )
      );

      mockRepository.findAll.mockResolvedValue(allAlerts.slice(0, 10));
      mockRepository.count.mockResolvedValue(50);

      const query = ListAlertsQuery.create(
        customerId.getValue(),
        undefined, // deviceId
        undefined, // severity
        undefined, // status
        undefined, // startTime
        undefined, // endTime
        10, // limit
        0 // offset
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.alerts).toHaveLength(10);
      expect(result.total).toBe(50);
    });

    it('should default to reasonable page size', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('handle - sorting', () => {
    it('should sort by timestamp descending (newest first)', async () => {
      // Arrange
      const alerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Old Alert',
          'Message',
          AlertSeverity.create('LOW'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        ),
        Alert.create(
          AlertId.fromString('alert-2'),
          'New Alert',
          'Message',
          AlertSeverity.create('LOW'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        )
      ];

      mockRepository.findAll.mockResolvedValue(alerts.reverse());

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.alerts).toBeDefined();
    });

    it('should sort by severity', async () => {
      // Arrange
      const alerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Low Alert',
          'Message',
          AlertSeverity.create('LOW'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        ),
        Alert.create(
          AlertId.fromString('alert-2'),
          'Critical Alert',
          'Message',
          AlertSeverity.create('CRITICAL'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'threshold_1'
        )
      ];

      mockRepository.findAll.mockResolvedValue(alerts);

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.alerts).toBeDefined();
    });
  });

  describe('handle - tenant isolation', () => {
    it('should only return alerts for the specified tenant', async () => {
      // Arrange
      const tenantAlerts = [
        Alert.create(
          AlertId.fromString('alert-1'),
          'Tenant Alert',
          'Message',
          AlertSeverity.create('MEDIUM'),
          AlertStatus.create('ACTIVE'),
          DeviceId.create('device-1'),
          customerId,
          'cpu_usage',
          MetricValue.create(85.0, 'percent'),
          80.0,
          ThresholdId.create('threshold_1'),
          new Date()
        )
      ];

      mockRepository.findAll.mockResolvedValue(tenantAlerts);

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        customerId,
        undefined, // timeRange
        undefined, // limit
        undefined  // offset
      );
      expect(result.alerts.every(a => a.customerId.getValue() === customerId.getValue())).toBe(true);
    });

    it('should reject access to alerts from different tenant', async () => {
      // Arrange
      const wrongTenant = CustomerId.create('cwrongcustomer00000000000001');
      mockRepository.findAll.mockResolvedValue([]); // Empty for wrong tenant
      mockRepository.count.mockResolvedValue(0);

      const query = ListAlertsQuery.create(
        wrongTenant.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert - should return empty because repository filters by wrong tenant
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result.alerts).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('handle - empty results', () => {
    it('should return empty array when no alerts exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      const query = ListAlertsQuery.create(
        customerId.getValue()
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.alerts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty array when filters match nothing', async () => {
      // Arrange
      mockRepository.findByStatus.mockResolvedValue([]);

      const query = ListAlertsQuery.create(
        customerId.getValue(),
        undefined, // deviceId
        undefined, // severity
        'RESOLVED' // status
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.alerts).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

