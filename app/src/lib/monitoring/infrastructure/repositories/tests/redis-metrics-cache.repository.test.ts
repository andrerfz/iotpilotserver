import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RedisMetricsCacheRepository} from '../redis-metrics-cache.repository';
import {Metric} from '../../../domain/entities/metric.entity';
import {MetricId} from '../../../domain/value-objects/metric-id.vo';
import {MetricValue} from '../../../domain/value-objects/metric-value.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';

// Mock Redis
const mockRedisClient = {
  multi: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zrevrange: vi.fn().mockReturnThis(),
    zremrangebyscore: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    keys: vi.fn().mockReturnThis(),
    zrange: vi.fn().mockReturnThis(),
    zscore: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }),
  set: vi.fn(),
  expire: vi.fn(),
  zadd: vi.fn(),
  zrevrange: vi.fn(),
  zremrangebyscore: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  zrange: vi.fn(),
  zscore: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedisClient),
}));

describe('RedisMetricsCacheRepository', () => {
  let repository: RedisMetricsCacheRepository;
  let mockTenantValidator: TenantBoundaryValidator;
  let metric: Metric;

  beforeEach(() => {
    mockTenantValidator = {
      validateTenantAccess: vi.fn(),
    } as TenantBoundaryValidator;

    repository = new RedisMetricsCacheRepository(mockRedisClient as any, mockTenantValidator);

    metric = Metric.create(
      MetricId.create('metric-1'),
      DeviceId.create('device-1'),
      'cpu_usage',
      MetricValue.create(85.5, 'percent'),
      new Date('2023-01-01T10:00:00Z'),
      new Map([['host', 'raspberry-pi-1']]),
      CustomerId.create('tenant-1')
    );

    vi.clearAllMocks();
  });

  describe('cacheMetric', () => {
    it('should cache metric with default TTL', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});

      await repository.cacheMetric(metric);

      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object), // tenantContext
        CustomerId.create('tenant-1'),
        'CacheMetric'
      );

      // Check that multi transaction was used
      expect(mockRedisClient.multi).toHaveBeenCalled();
      const multi = mockRedisClient.multi.mock.results[0].value;
      expect(multi.set).toHaveBeenCalledWith('metrics:metric-1', expect.any(String));
      expect(multi.expire).toHaveBeenCalledWith('metrics:metric-1', 86400);
      expect(multi.zadd).toHaveBeenCalled();
      expect(multi.exec).toHaveBeenCalled();
    });

    it('should cache metric with custom TTL', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});

      await repository.cacheMetric(metric, 3600);

      const multi = mockRedisClient.multi.mock.results[0].value;
      expect(multi.expire).toHaveBeenCalledWith('metrics:metric-1', 3600);
    });

    it('should throw error when tenant validation fails', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.cacheMetric(metric)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('cacheMetrics', () => {
    it('should cache multiple metrics', async () => {
      const metrics = [metric, metric];
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});

      await repository.cacheMetrics(metrics);

      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.multi).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLatestMetricsForDevice', () => {
    it('should return latest metrics for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.zrevrange.mockResolvedValue(['metric-1', 'metric-2']);

      // Mock deserialization
      const repo = repository as any;
      repo.deserializeMetric = vi.fn().mockReturnValue(metric);

      const result = await repository.getLatestMetricsForDevice(deviceId, tenantId, 10);

      expect(result).toHaveLength(2);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'GetLatestMetricsForDevice'
      );
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith('device-metrics:device-1:tenant-1', 0, 9);
      expect(repo.deserializeMetric).toHaveBeenCalledTimes(2);
    });

    it('should use default limit when not specified', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.zrevrange.mockResolvedValue([]);

      await repository.getLatestMetricsForDevice(deviceId, tenantId);

      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith('device-metrics:device-1:tenant-1', 0, 99);
    });
  });

  describe('getLatestMetricsByName', () => {
    it('should return latest metrics by name for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.zrevrange.mockResolvedValue(['metric-1']);

      const repo = repository as any;
      repo.deserializeMetric = vi.fn().mockReturnValue(metric);

      const result = await repository.getLatestMetricsByName(deviceId, 'cpu_usage', tenantId, 5);

      expect(result).toHaveLength(1);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith('device-metrics:device-1:cpu_usage:tenant-1', 0, 4);
    });
  });

  describe('getLatestMetricsForAllDevices', () => {
    it('should return latest metrics for all devices', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.keys.mockResolvedValue(['device-metrics:device-1:tenant-1', 'device-metrics:device-2:tenant-1']);
      mockRedisClient.zrevrange.mockResolvedValue(['metric-1']);

      const repo = repository as any;
      repo.deserializeMetric = vi.fn().mockReturnValue(metric);

      const result = await repository.getLatestMetricsForAllDevices(tenantId, 10);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
    });
  });

  describe('invalidateMetricsForDevice', () => {
    it('should invalidate all metrics for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.keys.mockResolvedValue(['device-metrics:device-1:cpu_usage:tenant-1']);
      mockRedisClient.del.mockResolvedValue(1);

      await repository.invalidateMetricsForDevice(deviceId, tenantId);

      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'InvalidateMetricsForDevice'
      );
      expect(mockRedisClient.keys).toHaveBeenCalledWith('device-metrics:device-1:*:tenant-1');
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('invalidateMetricsByName', () => {
    it('should invalidate metrics by name for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.del.mockResolvedValue(1);

      await repository.invalidateMetricsByName(deviceId, 'cpu_usage', tenantId);

      expect(mockRedisClient.del).toHaveBeenCalledWith('device-metrics:device-1:cpu_usage:tenant-1');
    });
  });

  describe('invalidateAllMetrics', () => {
    it('should invalidate all metrics for tenant', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.keys.mockResolvedValue(['tenant-metrics:tenant-1', 'device-metrics:device-1:cpu_usage:tenant-1']);
      mockRedisClient.del.mockResolvedValue(2);

      await repository.invalidateAllMetrics(tenantId);

      expect(mockRedisClient.keys).toHaveBeenCalledWith('*:tenant-1');
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('getCachedTimeRange', () => {
    it('should return time range of cached metrics', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.zrange.mockResolvedValue(['metric-1', 'metric-2']);
      mockRedisClient.zscore
        .mockResolvedValueOnce(1672569600000) // 2023-01-01T10:00:00Z
        .mockResolvedValueOnce(1672573200000); // 2023-01-01T11:00:00Z

      const result = await repository.getCachedTimeRange(deviceId, tenantId);

      expect(result).toBeInstanceOf(TimeRange);
      expect(result?.getStartTime().getTime()).toBe(1672569600000);
      expect(result?.getEndTime().getTime()).toBe(1672573200000);
    });

    it('should return null when no cached metrics', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockRedisClient.zrange.mockResolvedValue([]);

      const result = await repository.getCachedTimeRange(deviceId, tenantId);

      expect(result).toBeNull();
    });
  });

  describe('serialization methods', () => {
    it('should serialize and deserialize metric correctly', () => {
      const repo = repository as any;

      const serialized = repo.serializeMetric(metric);
      const deserialized = repo.deserializeMetric(serialized);

      expect(deserialized.id.value).toBe(metric.id.value);
      expect(deserialized.deviceId.value).toBe(metric.deviceId.value);
      expect(deserialized.name).toBe(metric.name);
      expect(deserialized.value.getValue()).toBe(metric.value.getValue());
      expect(deserialized.timestamp.getTime()).toBe(metric.timestamp.getTime());
    });
  });

  describe('key generation methods', () => {
    it('should generate correct keys', () => {
      const repo = repository as any;

      expect(repo.getMetricKey('metric-1')).toBe('metrics:metric-1');
      expect(repo.getDeviceMetricsKey('device-1', 'tenant-1')).toBe('device-metrics:device-1:tenant-1');
      expect(repo.getDeviceMetricNameKey('device-1', 'cpu_usage', 'tenant-1')).toBe('device-metrics:device-1:cpu_usage:tenant-1');
      expect(repo.getTenantMetricsKey('tenant-1')).toBe('tenant-metrics:tenant-1');
    });
  });
});
