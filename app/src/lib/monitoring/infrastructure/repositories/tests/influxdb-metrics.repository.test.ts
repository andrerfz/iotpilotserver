import {beforeEach, describe, expect, it, vi} from 'vitest';
import {InfluxDBMetricsRepository} from '../influxdb-metrics.repository';
import {Metric} from '../../../domain/entities/metric.entity';
import {MetricId} from '../../../domain/value-objects/metric-id.vo';
import {MetricValue} from '../../../domain/value-objects/metric-value.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';

// Mock InfluxDB
const mockWriteApi = {
  writePoint: vi.fn(),
  writePoints: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockQueryApi = {
  collectRows: vi.fn(),
};

const mockInfluxClient = {
  getWriteApi: vi.fn().mockReturnValue(mockWriteApi),
  getQueryApi: vi.fn().mockReturnValue(mockQueryApi),
};

vi.mock('@influxdata/influxdb-client', () => ({
  InfluxDB: vi.fn().mockImplementation(() => mockInfluxClient),
  Point: vi.fn().mockImplementation(() => ({
    tag: vi.fn().mockReturnThis(),
    floatField: vi.fn().mockReturnThis(),
    timestamp: vi.fn().mockReturnThis(),
  })),
}));

describe('InfluxDBMetricsRepository', () => {
  let repository: InfluxDBMetricsRepository;
  let mockTenantValidator: TenantBoundaryValidator;
  let metric: Metric;

  beforeEach(() => {
    mockTenantValidator = {
      validateTenantAccess: vi.fn(),
    } as TenantBoundaryValidator;

    repository = new InfluxDBMetricsRepository(
      mockInfluxClient as any,
      'test-org',
      'test-bucket',
      mockTenantValidator
    );

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

  describe('save', () => {
    it('should save metric to InfluxDB', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});

      await repository.save(metric);

      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object), // tenantContext
        CustomerId.create('tenant-1'),
        'SaveMetric'
      );
      expect(mockInfluxClient.getWriteApi).toHaveBeenCalledWith('test-org', 'test-bucket', 'ns');
      expect(mockWriteApi.writePoint).toHaveBeenCalled();
      expect(mockWriteApi.close).toHaveBeenCalled();
    });

    it('should throw error when tenant validation fails', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.save(metric)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('saveMany', () => {
    it('should save multiple metrics to InfluxDB', async () => {
      const metrics = [metric, metric];
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});

      await repository.saveMany(metrics);

      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledTimes(2);
      expect(mockInfluxClient.getWriteApi).toHaveBeenCalledWith('test-org', 'test-bucket', 'ns');
      expect(mockWriteApi.writePoints).toHaveBeenCalled();
      expect(mockWriteApi.close).toHaveBeenCalled();
    });

    it('should throw error when tenant validation fails for any metric', async () => {
      const metrics = [metric, metric];
      mockTenantValidator.validateTenantAccess
        .mockImplementationOnce(() => {}) // First call succeeds
        .mockImplementationOnce(() => {   // Second call fails
          throw new Error('Tenant access denied');
        });

      await expect(repository.saveMany(metrics)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('findById', () => {
    it('should query InfluxDB for metric by ID', async () => {
      const tenantId = CustomerId.create('tenant-1');
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findById(MetricId.create('metric-1'), tenantId);

      expect(result).toBeNull();
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindMetricById'
      );
      expect(mockInfluxClient.getQueryApi).toHaveBeenCalledWith('test-org');
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });

    it('should throw error when tenant validation fails', async () => {
      const tenantId = CustomerId.create('tenant-1');
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.findById(MetricId.create('metric-1'), tenantId)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('findByDeviceId', () => {
    it('should query metrics for specific device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');
      const timeRange = TimeRange.createLastHour();

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findByDeviceId(deviceId, tenantId, timeRange);

      expect(result).toHaveLength(0);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindMetricsByDeviceId'
      );
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });

    it('should work without time range filter', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findByDeviceId(deviceId, tenantId);

      expect(result).toHaveLength(0);
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should query metrics by name', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findByName('cpu_usage', tenantId);

      expect(result).toHaveLength(0);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindMetricsByName'
      );
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });
  });

  describe('findByDeviceIdAndName', () => {
    it('should query metrics by device ID and name', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const deviceId = DeviceId.create('device-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findByDeviceIdAndName(deviceId, 'cpu_usage', tenantId);

      expect(result).toHaveLength(0);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindMetricsByDeviceIdAndName'
      );
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });
  });

  describe('findByTag', () => {
    it('should query metrics by tag', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findByTag('host', 'raspberry-pi-1', tenantId);

      expect(result).toHaveLength(0);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindMetricsByTag'
      );
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should query all metrics for tenant', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const timeRange = TimeRange.createLastHour();

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findAll(tenantId, timeRange, 100);

      expect(result).toHaveLength(0);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object),
        tenantId,
        'FindAllMetrics'
      );
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });

    it('should work without time range and limit', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockQueryApi.collectRows.mockResolvedValue([]);

      const result = await repository.findAll(tenantId);

      expect(result).toHaveLength(0);
      expect(mockQueryApi.collectRows).toHaveBeenCalled();
    });
  });

  describe('metricToPoint conversion', () => {
    it('should convert metric to InfluxDB point', () => {
      const repo = repository as any;
      const point = repo.metricToPoint(metric);

      expect(point).toBeDefined();
      // The Point constructor should have been called with the measurement name
      expect(vi.mocked(point.tag)).toHaveBeenCalledWith('deviceId', 'device-1');
      expect(vi.mocked(point.tag)).toHaveBeenCalledWith('tenantId', 'tenant-1');
      expect(vi.mocked(point.tag)).toHaveBeenCalledWith('host', 'raspberry-pi-1');
      expect(vi.mocked(point.floatField)).toHaveBeenCalledWith('cpu_usage', 85.5);
      expect(vi.mocked(point.timestamp)).toHaveBeenCalledWith(new Date('2023-01-01T10:00:00Z'));
    });
  });

  describe('buildFluxQuery', () => {
    it('should build Flux query with filters', () => {
      const repo = repository as any;
      const query = repo.buildFluxQuery({
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        name: 'cpu_usage',
        timeRange: TimeRange.createLastHour(),
        limit: 100
      });

      expect(query).toContain('from(bucket: "test-bucket")');
      expect(query).toContain('tenantId == "tenant-1"');
      expect(query).toContain('deviceId == "device-1"');
      expect(query).toContain('cpu_usage');
      expect(query).toContain('limit(n: 100)');
    });

    it('should build Flux query without optional filters', () => {
      const repo = repository as any;
      const query = repo.buildFluxQuery({
        tenantId: 'tenant-1'
      });

      expect(query).toContain('from(bucket: "test-bucket")');
      expect(query).toContain('tenantId == "tenant-1"');
      expect(query).not.toContain('deviceId');
      expect(query).not.toContain('limit');
    });
  });

  describe('mapRowToMetric', () => {
    it('should map InfluxDB row to Metric entity', () => {
      const repo = repository as any;
      const row = {
        _measurement: 'cpu_usage',
        _value: 85.5,
        _time: '2023-01-01T10:00:00Z',
        deviceId: 'device-1',
        tenantId: 'tenant-1',
        host: 'raspberry-pi-1',
        unit: 'percent'
      };

      const result = repo.mapRowToMetric(row);

      expect(result).toBeInstanceOf(Metric);
      expect(result.deviceId.value).toBe('device-1');
      expect(result.name).toBe('cpu_usage');
      expect(result.value.getValue()).toBe(85.5);
      expect(result.value.getUnit()).toBe('percent');
    });
  });
});
