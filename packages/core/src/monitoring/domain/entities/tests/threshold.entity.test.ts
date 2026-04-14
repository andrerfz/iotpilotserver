import {ComparisonOperator, Threshold, ThresholdType} from '../threshold.entity';
import {ThresholdId} from '../../value-objects/threshold-id.vo';
import {AlertSeverity} from '../../value-objects/alert-severity.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdUpdatedEvent} from '../../events/threshold-updated.event';

describe('Threshold Entity', () => {
  const mockThresholdId = ThresholdId.create('threshold-123');
  const mockDeviceId = DeviceId.create('device-123');
  const mockCustomerId = CustomerId.create('ccustomer123000000000000001');
  const mockSeverity = AlertSeverity.create('HIGH');
  const mockMetadata = { source: 'system', category: 'performance' };

  describe('create', () => {
    it('should create a valid device-specific threshold', () => {
      const threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'CPU Usage Alert',
        'Alert when CPU usage exceeds 80%',
        'cpu_usage',
        '>',
        80.0,
        'percentage',
        mockSeverity,
        'cpu',
        5,
        mockMetadata,
        mockCustomerId
      );

      expect(threshold).toBeDefined();
      expect(threshold.id).toBe(mockThresholdId);
      expect(threshold.deviceId).toBe(mockDeviceId);
      expect(threshold.name).toBe('CPU Usage Alert');
      expect(threshold.description).toBe('Alert when CPU usage exceeds 80%');
      expect(threshold.metricName).toBe('cpu_usage');
      expect(threshold.operator).toBe('>');
      expect(threshold.value).toBe(80.0);
      expect(threshold.unit).toBe('percentage');
      expect(threshold.severity).toBe(mockSeverity);
      expect(threshold.type).toBe('cpu');
      expect(threshold.cooldownMinutes).toBe(5);
      expect(threshold.enabled).toBe(true);
      expect(threshold.isEnabled()).toBe(true);
      expect(threshold.isGlobal()).toBe(false);
      expect(threshold.getTenantId()).toBe(mockCustomerId);
      expect(threshold.metadata).toEqual(mockMetadata);
    });

    it('should create a valid global threshold', () => {
      const threshold = Threshold.create(
        mockThresholdId,
        null,
        'Global Memory Alert',
        'Global memory usage alert',
        'memory_usage',
        '>=',
        90.0,
        'percentage',
        mockSeverity,
        'memory',
        10,
        mockMetadata,
        mockCustomerId
      );

      expect(threshold.deviceId).toBeNull();
      expect(threshold.isGlobal()).toBe(true);
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new (Threshold as any)(
          mockThresholdId,
          mockDeviceId,
          '',
          'Description',
          'cpu_usage',
          '>',
          80.0,
          'percentage',
          mockSeverity,
          true,
          'cpu',
          5,
          new Date(),
          new Date(),
          mockMetadata,
          mockCustomerId
        );
      }).toThrow('Threshold name cannot be empty');
    });

    it('should throw error for empty metric name', () => {
      expect(() => {
        new (Threshold as any)(
          mockThresholdId,
          mockDeviceId,
          'CPU Alert',
          'Description',
          '',
          '>',
          80.0,
          'percentage',
          mockSeverity,
          true,
          'cpu',
          5,
          new Date(),
          new Date(),
          mockMetadata,
          mockCustomerId
        );
      }).toThrow('Threshold metric name cannot be empty');
    });

    it('should throw error for negative cooldown minutes', () => {
      expect(() => {
        new (Threshold as any)(
          mockThresholdId,
          mockDeviceId,
          'CPU Alert',
          'Description',
          'cpu_usage',
          '>',
          80.0,
          'percentage',
          mockSeverity,
          true,
          'cpu',
          -1,
          new Date(),
          new Date(),
          mockMetadata,
          mockCustomerId
        );
      }).toThrow('Threshold cooldown minutes cannot be negative');
    });
  });

  describe('enable/disable functionality', () => {
    let threshold: Threshold;

    beforeEach(() => {
      threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'CPU Usage Alert',
        'Alert when CPU usage exceeds 80%',
        'cpu_usage',
        '>',
        80.0,
        'percentage',
        mockSeverity,
        'cpu',
        5,
        mockMetadata,
        mockCustomerId
      );
      // Clear any events from creation
      threshold.clearEvents();
    });

    it('should enable a disabled threshold', () => {
      // First disable it
      threshold.disable();
      threshold.clearEvents();

      // Then enable it
      threshold.enable();

      expect(threshold.isEnabled()).toBe(true);
      expect(threshold.enabled).toBe(true);
      
      // Should emit ThresholdUpdatedEvent
      const events = threshold.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ThresholdUpdatedEvent);
    });

    it('should not emit event when enabling already enabled threshold', () => {
      expect(threshold.isEnabled()).toBe(true);
      
      threshold.enable();

      const events = threshold.getEvents();
      expect(events).toHaveLength(0);
    });

    it('should disable an enabled threshold', () => {
      expect(threshold.isEnabled()).toBe(true);

      threshold.disable();

      expect(threshold.isEnabled()).toBe(false);
      expect(threshold.enabled).toBe(false);
      
      // Should emit ThresholdUpdatedEvent
      const events = threshold.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ThresholdUpdatedEvent);
    });

    it('should not emit event when disabling already disabled threshold', () => {
      threshold.disable();
      threshold.clearEvents();

      threshold.disable();

      const events = threshold.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('update functionality', () => {
    let threshold: Threshold;

    beforeEach(() => {
      threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'CPU Usage Alert',
        'Alert when CPU usage exceeds 80%',
        'cpu_usage',
        '>',
        80.0,
        'percentage',
        mockSeverity,
        'cpu',
        5,
        mockMetadata,
        mockCustomerId
      );
      threshold.clearEvents();
    });

    it('should update all properties', () => {
      const newSeverity = AlertSeverity.create('CRITICAL');
      const originalUpdatedAt = threshold.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        threshold.update(
          'Memory Usage Alert',
          'Alert when memory usage exceeds 90%',
          'memory_usage',
          '>=',
          90.0,
          'percentage',
          newSeverity,
          'memory',
          10
        );

        expect(threshold.name).toBe('Memory Usage Alert');
        expect(threshold.description).toBe('Alert when memory usage exceeds 90%');
        expect(threshold.metricName).toBe('memory_usage');
        expect(threshold.operator).toBe('>=');
        expect(threshold.value).toBe(90.0);
        expect(threshold.unit).toBe('percentage');
        expect(threshold.severity).toBe(newSeverity);
        expect(threshold.type).toBe('memory');
        expect(threshold.cooldownMinutes).toBe(10);
        expect(threshold.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

        // Should emit ThresholdUpdatedEvent
        const events = threshold.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ThresholdUpdatedEvent);
      }, 1);
    });
  });

  describe('metric evaluation', () => {
    let threshold: Threshold;

    it.each([
      ['>', 85.0, 80.0, true],
      ['>', 75.0, 80.0, false],
      ['>=', 80.0, 80.0, true],
      ['>=', 85.0, 80.0, true],
      ['>=', 75.0, 80.0, false],
      ['<', 75.0, 80.0, true],
      ['<', 85.0, 80.0, false],
      ['<=', 80.0, 80.0, true],
      ['<=', 75.0, 80.0, true],
      ['<=', 85.0, 80.0, false],
      ['==', 80.0, 80.0, true],
      ['==', 85.0, 80.0, false],
      ['!=', 85.0, 80.0, true],
      ['!=', 80.0, 80.0, false],
    ])('should evaluate %s operator correctly', (operator, metricValue, thresholdValue, expected) => {
      threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'Test Alert',
        'Test description',
        'test_metric',
        operator as ComparisonOperator,
        thresholdValue,
        'units',
        mockSeverity,
        'custom',
        5,
        mockMetadata,
        mockCustomerId
      );

      expect(threshold.evaluateMetric(metricValue)).toBe(expected);
    });

    it('should throw error for invalid operator', () => {
      // Create threshold with invalid operator by bypassing validation
      const invalidThreshold = new (Threshold as any)(
        mockThresholdId,
        mockDeviceId,
        'Test Alert',
        'Test description',
        'test_metric',
        'invalid' as ComparisonOperator,
        80.0,
        'percentage',
        mockSeverity,
        true,
        'custom' as ThresholdType,
        5,
        new Date(),
        new Date(),
        mockMetadata,
        mockCustomerId
      );

      expect(() => invalidThreshold.evaluateMetric(85.0)).toThrow('Invalid operator: invalid');
    });
  });

  describe('getters and immutability', () => {
    let threshold: Threshold;

    beforeEach(() => {
      threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'CPU Usage Alert',
        'Alert when CPU usage exceeds 80%',
        'cpu_usage',
        '>',
        80.0,
        'percentage',
        mockSeverity,
        'cpu',
        5,
        mockMetadata,
        mockCustomerId
      );
    });

    it('should return correct id through getId()', () => {
      expect(threshold.getId()).toBe(mockThresholdId);
    });

    it('should return new Date instances for timestamps', () => {
      const createdAt = threshold.createdAt;
      const updatedAt = threshold.updatedAt;

      expect(createdAt).toBeInstanceOf(Date);
      expect(updatedAt).toBeInstanceOf(Date);

      // Modify returned dates shouldn't affect original
      createdAt.setFullYear(2020);
      updatedAt.setFullYear(2020);

      expect(threshold.createdAt.getFullYear()).not.toBe(2020);
      expect(threshold.updatedAt.getFullYear()).not.toBe(2020);
    });

    it('should return new metadata object', () => {
      const metadata = threshold.metadata;
      expect(metadata).toEqual(mockMetadata);
      expect(metadata).not.toBe(mockMetadata);

      // Modify returned metadata shouldn't affect original
      metadata.newProp = 'new value';
      expect(threshold.metadata.newProp).toBeUndefined();
    });
  });

  describe('tenant isolation', () => {
    it('should be tenant-scoped', () => {
      const threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'CPU Usage Alert',
        'Alert when CPU usage exceeds 80%',
        'cpu_usage',
        '>',
        80.0,
        'percentage',
        mockSeverity,
        'cpu',
        5,
        mockMetadata,
        mockCustomerId
      );

      expect(threshold.getTenantId()).toBe(mockCustomerId);
      expect(threshold.belongsToTenant(mockCustomerId)).toBe(true);
      expect(threshold.belongsToTenant(CustomerId.create('cothercustomer000000000000001'))).toBe(false);
    });
  });

  describe('threshold types', () => {
    it.each([
      'cpu', 'memory', 'disk', 'temperature', 'network', 'custom'
    ])('should support %s threshold type', (type) => {
      const threshold = Threshold.create(
        mockThresholdId,
        mockDeviceId,
        'Test Alert',
        'Test description',
        'test_metric',
        '>',
        80.0,
        'units',
        mockSeverity,
        type as ThresholdType,
        5,
        mockMetadata,
        mockCustomerId
      );

      expect(threshold.type).toBe(type);
    });
  });
});