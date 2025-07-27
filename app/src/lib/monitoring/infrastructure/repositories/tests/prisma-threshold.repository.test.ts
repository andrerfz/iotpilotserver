import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaThresholdRepository} from '../prisma-threshold.repository';
import {Threshold} from '../../../domain/entities/threshold.entity';
import {ThresholdId} from '../../../domain/value-objects/threshold-id.vo';
import {AlertSeverity} from '../../../domain/value-objects/alert-severity.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';

// Mock Prisma
const mockPrismaClient = {
  threshold: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PrismaThresholdRepository', () => {
  let repository: PrismaThresholdRepository;
  let mockTenantValidator: TenantBoundaryValidator;
  let threshold: Threshold;

  beforeEach(() => {
    mockTenantValidator = {
      validateTenantAccess: vi.fn(),
    } as TenantBoundaryValidator;

    repository = new PrismaThresholdRepository(mockPrismaClient as any, mockTenantValidator);

    threshold = Threshold.create(
      ThresholdId.create('threshold-1'),
      DeviceId.create('device-1'),
      'High CPU Threshold',
      'Alert when CPU exceeds 90%',
      'cpu_usage',
      '>',
      90.0,
      'percent',
      AlertSeverity.create('CRITICAL'),
      'cpu',
      5,
      CustomerId.create('tenant-1')
    );

    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save new threshold successfully', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.upsert.mockResolvedValue({
        id: 'threshold-1',
        deviceId: 'device-1',
        name: 'High CPU Threshold',
        customerId: 'tenant-1'
      });

      const result = await repository.save(threshold);

      expect(result).toBe(threshold);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object), // tenantContext
        CustomerId.create('tenant-1'),
        'SaveThreshold'
      );
      expect(mockPrismaClient.threshold.upsert).toHaveBeenCalledWith({
        where: { id: 'threshold-1' },
        update: expect.objectContaining({
          id: 'threshold-1',
          deviceId: 'device-1',
          name: 'High CPU Threshold',
          description: 'Alert when CPU exceeds 90%',
          metricName: 'cpu_usage',
          operator: '>',
          value: 90.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 5,
          customerId: 'tenant-1'
        }),
        create: expect.objectContaining({
          id: 'threshold-1',
          deviceId: 'device-1',
          name: 'High CPU Threshold',
          customerId: 'tenant-1'
        })
      });
    });

    it('should throw error when tenant validation fails', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.save(threshold)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('findById', () => {
    it('should return threshold when found', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const thresholdData = {
        id: 'threshold-1',
        deviceId: 'device-1',
        name: 'High CPU Threshold',
        description: 'Alert when CPU exceeds 90%',
        metricName: 'cpu_usage',
        operator: '>',
        value: 90.0,
        unit: 'percent',
        severity: 'CRITICAL',
        enabled: true,
        type: 'cpu',
        cooldownMinutes: 5,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        metadata: {},
        customerId: 'tenant-1'
      };

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findFirst.mockResolvedValue(thresholdData);

      const result = await repository.findById(ThresholdId.create('threshold-1'), tenantId);

      expect(result).toBeInstanceOf(Threshold);
      expect(result?.id.value).toBe('threshold-1');
      expect(mockPrismaClient.threshold.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'threshold-1',
          customerId: 'tenant-1'
        }
      });
    });

    it('should return null when threshold not found', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findFirst.mockResolvedValue(null);

      const result = await repository.findById(ThresholdId.create('non-existent'), tenantId);

      expect(result).toBeNull();
    });
  });

  describe('findByDeviceId', () => {
    it('should return thresholds for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const thresholdsData = [
        {
          id: 'threshold-1',
          deviceId: 'device-1',
          name: 'High CPU Threshold',
          description: 'Alert when CPU exceeds 90%',
          metricName: 'cpu_usage',
          operator: '>',
          value: 90.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 5,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-01T10:00:00Z'),
          metadata: {},
          customerId: 'tenant-1'
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue(thresholdsData);

      const result = await repository.findByDeviceId(DeviceId.create('device-1'), tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Threshold);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          deviceId: 'device-1',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findGlobalThresholds', () => {
    it('should return global thresholds (null deviceId)', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const thresholdsData = [
        {
          id: 'threshold-global',
          deviceId: null,
          name: 'Global CPU Threshold',
          description: 'Global alert when CPU exceeds 95%',
          metricName: 'cpu_usage',
          operator: '>',
          value: 95.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 10,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-01T10:00:00Z'),
          metadata: {},
          customerId: 'tenant-1'
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue(thresholdsData);

      const result = await repository.findGlobalThresholds(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Threshold);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          deviceId: null,
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findByType', () => {
    it('should return thresholds by type', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const thresholdsData = [
        {
          id: 'threshold-1',
          deviceId: 'device-1',
          name: 'CPU Threshold',
          description: 'CPU threshold',
          metricName: 'cpu_usage',
          operator: '>',
          value: 90.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 5,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-01T10:00:00Z'),
          metadata: {},
          customerId: 'tenant-1'
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue(thresholdsData);

      const result = await repository.findByType('cpu', tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          type: 'cpu',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findByMetricName', () => {
    it('should return thresholds by metric name', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue([]);

      const result = await repository.findByMetricName('cpu_usage', tenantId);

      expect(result).toHaveLength(0);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          metricName: 'cpu_usage',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findBySeverity', () => {
    it('should return thresholds by severity', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const severity = AlertSeverity.create('CRITICAL');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue([]);

      const result = await repository.findBySeverity(severity, tenantId);

      expect(result).toHaveLength(0);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          severity: 'CRITICAL',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findAll', () => {
    it('should return all thresholds for tenant', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue([]);

      const result = await repository.findAll(tenantId);

      expect(result).toHaveLength(0);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should include disabled thresholds when requested', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue([]);

      await repository.findAll(tenantId, true);

      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findApplicableThresholds', () => {
    it('should return device-specific and global thresholds', async () => {
      const deviceId = DeviceId.create('device-1');
      const tenantId = CustomerId.create('tenant-1');
      const thresholdsData = [
        {
          id: 'threshold-device',
          deviceId: 'device-1',
          name: 'Device CPU Threshold',
          description: 'Device-specific threshold',
          metricName: 'cpu_usage',
          operator: '>',
          value: 90.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 5,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-01T10:00:00Z'),
          metadata: {},
          customerId: 'tenant-1'
        },
        {
          id: 'threshold-global',
          deviceId: null,
          name: 'Global CPU Threshold',
          description: 'Global threshold',
          metricName: 'cpu_usage',
          operator: '>',
          value: 95.0,
          unit: 'percent',
          severity: 'CRITICAL',
          enabled: true,
          type: 'cpu',
          cooldownMinutes: 10,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-01T10:00:00Z'),
          metadata: {},
          customerId: 'tenant-1'
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findMany.mockResolvedValue(thresholdsData);

      const result = await repository.findApplicableThresholds(deviceId, tenantId);

      expect(result).toHaveLength(2);
      expect(mockPrismaClient.threshold.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { deviceId: 'device-1', customerId: 'tenant-1' },
            { deviceId: null, customerId: 'tenant-1' }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findByName', () => {
    it('should return threshold by name', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const thresholdData = {
        id: 'threshold-1',
        deviceId: 'device-1',
        name: 'High CPU Threshold',
        description: 'Alert when CPU exceeds 90%',
        metricName: 'cpu_usage',
        operator: '>',
        value: 90.0,
        unit: 'percent',
        severity: 'CRITICAL',
        enabled: true,
        type: 'cpu',
        cooldownMinutes: 5,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        metadata: {},
        customerId: 'tenant-1'
      };

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findFirst.mockResolvedValue(thresholdData);

      const result = await repository.findByName('High CPU Threshold', tenantId);

      expect(result).toBeInstanceOf(Threshold);
      expect(result?.name).toBe('High CPU Threshold');
      expect(mockPrismaClient.threshold.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'High CPU Threshold',
          customerId: 'tenant-1'
        }
      });
    });

    it('should return null when threshold not found by name', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('Non-existent Threshold', tenantId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete threshold', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.threshold.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete(ThresholdId.create('threshold-1'), tenantId);

      expect(mockPrismaClient.threshold.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'threshold-1',
          customerId: 'tenant-1'
        }
      });
    });

    it('should throw error when tenant validation fails', async () => {
      const tenantId = CustomerId.create('tenant-1');
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.delete(ThresholdId.create('threshold-1'), tenantId)).rejects.toThrow('Tenant access denied');
    });
  });
});
