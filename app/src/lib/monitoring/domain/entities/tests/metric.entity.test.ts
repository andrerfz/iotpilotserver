import {Metric} from '../metric.entity';
import {MetricId} from '../../value-objects/metric-id.vo';
import {MetricValue} from '../../value-objects/metric-value.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

describe('Metric Entity', () => {
  const mockMetricId = MetricId.create('metric-123');
  const mockDeviceId = DeviceId.create('device-123');
  const mockCustomerId = CustomerId.create('customer-123');
  const mockMetricValue = MetricValue.create(85.5, 'percentage');
  const mockTimestamp = new Date('2024-01-01T10:00:00Z');
  const mockTags = new Map([
    ['host', 'server-01'],
    ['region', 'us-east-1']
  ]);

  describe('create', () => {
    it('should create a valid metric', () => {
      const metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );

      expect(metric).toBeDefined();
      expect(metric.id).toBe(mockMetricId);
      expect(metric.deviceId).toBe(mockDeviceId);
      expect(metric.name).toBe('cpu_usage');
      expect(metric.value).toBe(mockMetricValue);
      expect(metric.timestamp).toEqual(mockTimestamp);
      expect(metric.getTenantId()).toBe(mockCustomerId);
      expect(metric.tags.size).toBe(2);
      expect(metric.tags.get('host')).toBe('server-01');
      expect(metric.tags.get('region')).toBe('us-east-1');
    });

    it('should throw error for empty metric name', () => {
      expect(() => {
        new (Metric as any)(
          mockMetricId,
          mockDeviceId,
          '',
          mockMetricValue,
          mockTimestamp,
          mockTags,
          mockCustomerId
        );
      }).toThrow('Metric name cannot be empty');
    });

    it('should throw error for null metric name', () => {
      expect(() => {
        new (Metric as any)(
          mockMetricId,
          mockDeviceId,
          null,
          mockMetricValue,
          mockTimestamp,
          mockTags,
          mockCustomerId
        );
      }).toThrow('Metric name cannot be empty');
    });

    it('should throw error for null timestamp', () => {
      expect(() => {
        new (Metric as any)(
          mockMetricId,
          mockDeviceId,
          'cpu_usage',
          mockMetricValue,
          null,
          mockTags,
          mockCustomerId
        );
      }).toThrow('Metric timestamp cannot be empty');
    });

    it('should create metric with empty tags', () => {
      const emptyTags = new Map<string, string>();
      const metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        emptyTags,
        mockCustomerId
      );

      expect(metric.tags.size).toBe(0);
    });
  });

  describe('getters', () => {
    let metric: Metric;

    beforeEach(() => {
      metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );
    });

    it('should return correct id through getId()', () => {
      expect(metric.getId()).toBe(mockMetricId);
    });

    it('should return correct id through getter', () => {
      expect(metric.id).toBe(mockMetricId);
    });

    it('should return correct deviceId', () => {
      expect(metric.deviceId).toBe(mockDeviceId);
    });

    it('should return correct name', () => {
      expect(metric.name).toBe('cpu_usage');
    });

    it('should return correct value', () => {
      expect(metric.value).toBe(mockMetricValue);
    });

    it('should return new Date instance for timestamp', () => {
      const timestamp = metric.timestamp;
      expect(timestamp).toEqual(mockTimestamp);
      expect(timestamp).not.toBe(mockTimestamp); // Should be a new instance
    });

    it('should return new Map instance for tags', () => {
      const tags = metric.tags;
      expect(tags).toEqual(mockTags);
      expect(tags).not.toBe(mockTags); // Should be a new instance
      expect(tags.get('host')).toBe('server-01');
      expect(tags.get('region')).toBe('us-east-1');
    });
  });

  describe('tag operations', () => {
    let metric: Metric;

    beforeEach(() => {
      metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );
    });

    it('should check if tag exists', () => {
      expect(metric.hasTag('host')).toBe(true);
      expect(metric.hasTag('region')).toBe(true);
      expect(metric.hasTag('nonexistent')).toBe(false);
    });

    it('should get tag value', () => {
      expect(metric.getTag('host')).toBe('server-01');
      expect(metric.getTag('region')).toBe('us-east-1');
      expect(metric.getTag('nonexistent')).toBeUndefined();
    });

    it('should handle empty string tag keys', () => {
      expect(metric.hasTag('')).toBe(false);
      expect(metric.getTag('')).toBeUndefined();
    });
  });

  describe('immutability', () => {
    it('should not allow modification of returned tags map', () => {
      const metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );

      const tags = metric.tags;
      tags.set('new-tag', 'new-value');

      // Original metric should not be affected
      expect(metric.hasTag('new-tag')).toBe(false);
      expect(metric.tags.size).toBe(2);
    });

    it('should not allow modification of returned timestamp', () => {
      const metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );

      const timestamp = metric.timestamp;
      timestamp.setFullYear(2025);

      // Original metric should not be affected
      expect(metric.timestamp.getFullYear()).toBe(2024);
    });
  });

  describe('tenant isolation', () => {
    it('should be tenant-scoped', () => {
      const metric = Metric.create(
        mockMetricId,
        mockDeviceId,
        'cpu_usage',
        mockMetricValue,
        mockTimestamp,
        mockTags,
        mockCustomerId
      );

      expect(metric.getTenantId()).toBe(mockCustomerId);
      expect(metric.belongsToTenant(mockCustomerId)).toBe(true);
      expect(metric.belongsToTenant(CustomerId.create('other-customer'))).toBe(false);
    });
  });
});