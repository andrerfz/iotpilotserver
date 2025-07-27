import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaAlertRepository} from '../prisma-alert.repository';
import {AlertId} from '../../../domain/value-objects/alert-id.vo';
import {AlertSeverity} from '../../../domain/value-objects/alert-severity.vo';
import {AlertStatus} from '../../../domain/value-objects/alert-status.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../../../domain/value-objects/threshold-id.vo';
import {MetricValue} from '../../../domain/value-objects/metric-value.vo';
import {TimeRange} from '../../../domain/value-objects/time-range.vo';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';

// Mock Prisma
const mockPrismaClient = {
  alert: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PrismaAlertRepository', () => {
  let repository: PrismaAlertRepository;
  let mockTenantValidator: TenantBoundaryValidator;
  let alert: Alert;

  beforeEach(() => {
    mockTenantValidator = {
      validateTenantAccess: vi.fn(),
    } as TenantBoundaryValidator;

    repository = new PrismaAlertRepository(mockPrismaClient as any, mockTenantValidator);

    alert = Alert.create(
      AlertId.create('alert-1'),
      'High CPU Usage',
      'CPU usage exceeded 90%',
      AlertSeverity.create('CRITICAL'),
      AlertStatus.create('ACTIVE'),
      DeviceId.create('device-1'),
      CustomerId.create('tenant-1'),
      'cpu_usage',
      MetricValue.create(95.0, 'percent'),
      90.0,
      ThresholdId.create('threshold-1'),
      new Date('2023-01-01T10:00:00Z')
    );

    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save new alert successfully', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.upsert.mockResolvedValue({
        id: 'alert-1',
        deviceId: 'device-1',
        thresholdId: 'threshold-1',
        title: 'High CPU Usage',
        message: 'CPU usage exceeded 90%',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        customerId: 'tenant-1',
        type: 'CUSTOM'
      });

      const result = await repository.save(alert);

      expect(result).toBe(alert);
      expect(mockTenantValidator.validateTenantAccess).toHaveBeenCalledWith(
        expect.any(Object), // tenantContext
        CustomerId.create('tenant-1'),
        'SaveAlert'
      );
      expect(mockPrismaClient.alert.upsert).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        update: expect.objectContaining({
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          customerId: 'tenant-1',
          type: 'CUSTOM'
        }),
        create: expect.objectContaining({
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          customerId: 'tenant-1',
          type: 'CUSTOM'
        })
      });
    });

    it('should throw error when tenant validation fails', async () => {
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.save(alert)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('findById', () => {
    it('should return alert when found', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const alertData = {
        id: 'alert-1',
        deviceId: 'device-1',
        thresholdId: 'threshold-1',
        title: 'High CPU Usage',
        message: 'CPU usage exceeded 90%',
        severity: 'CRITICAL',
        status: 'active',
        customerId: 'tenant-1',
        tenantId: 'tenant-1',
        metricName: 'cpu_usage',
        metricValue: { value: 95.0, unit: 'percent' },
        thresholdValue: 90.0,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
        resolvedBy: null,
        notes: null
      };

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findFirst.mockResolvedValue(alertData);

      const result = await repository.findById(AlertId.create('alert-1'), tenantId);

      expect(result).toBeInstanceOf(Alert);
      expect(result?.id.value).toBe('alert-1');
      expect(mockPrismaClient.alert.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
          customerId: 'tenant-1'
        }
      });
    });

    it('should return null when alert not found', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findFirst.mockResolvedValue(null);

      const result = await repository.findById(AlertId.create('non-existent'), tenantId);

      expect(result).toBeNull();
    });

    it('should throw error when tenant validation fails', async () => {
      const tenantId = CustomerId.create('tenant-1');
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.findById(AlertId.create('alert-1'), tenantId)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('findByDeviceId', () => {
    it('should return alerts for device', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const timeRange = TimeRange.createLastHour();
      const alertsData = [
        {
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'active',
          customerId: 'tenant-1',
          tenantId: 'tenant-1',
          metricName: 'cpu_usage',
          metricValue: { value: 95.0, unit: 'percent' },
          thresholdValue: 90.0,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          notes: null
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue(alertsData);

      const result = await repository.findByDeviceId(DeviceId.create('device-1'), tenantId, timeRange);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Alert);
      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deviceId: 'device-1',
          customerId: 'tenant-1',
          createdAt: expect.any(Object)
        }),
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should find alerts without time range filter', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue([]);

      await repository.findByDeviceId(DeviceId.create('device-1'), tenantId);

      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: {
          deviceId: 'device-1',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findByThresholdId', () => {
    it('should return alerts for threshold', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const alertsData = [
        {
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'active',
          customerId: 'tenant-1',
          tenantId: 'tenant-1',
          metricName: 'cpu_usage',
          metricValue: { value: 95.0, unit: 'percent' },
          thresholdValue: 90.0,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          notes: null
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue(alertsData);

      const result = await repository.findByThresholdId(ThresholdId.create('threshold-1'), tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Alert);
      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: {
          thresholdId: 'threshold-1',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findBySeverity', () => {
    it('should return alerts by severity', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const severity = AlertSeverity.create('CRITICAL');
      const alertsData = [
        {
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'active',
          customerId: 'tenant-1',
          tenantId: 'tenant-1',
          metricName: 'cpu_usage',
          metricValue: { value: 95.0, unit: 'percent' },
          thresholdValue: 90.0,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          notes: null
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue(alertsData);

      const result = await repository.findBySeverity(severity, tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: {
          severity: 'CRITICAL',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findByStatus', () => {
    it('should return alerts by status', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const status = AlertStatus.create('ACTIVE');
      const alertsData = [
        {
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          customerId: 'tenant-1',
          tenantId: 'tenant-1',
          metricName: 'cpu_usage',
          metricValue: { value: 95.0, unit: 'percent' },
          thresholdValue: 90.0,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          notes: null
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue(alertsData);

      const result = await repository.findByStatus(status, tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findAll', () => {
    it('should return all alerts with pagination', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const alertsData = [
        {
          id: 'alert-1',
          deviceId: 'device-1',
          thresholdId: 'threshold-1',
          title: 'High CPU Usage',
          message: 'CPU usage exceeded 90%',
          severity: 'CRITICAL',
          status: 'active',
          customerId: 'tenant-1',
          tenantId: 'tenant-1',
          metricName: 'cpu_usage',
          metricValue: { value: 95.0, unit: 'percent' },
          thresholdValue: 90.0,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          resolvedBy: null,
          notes: null
        }
      ];

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.findMany.mockResolvedValue(alertsData);

      const result = await repository.findAll(tenantId, undefined, 10, 5);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.alert.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'tenant-1'
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5
      });
    });
  });

  describe('count', () => {
    it('should return alert count', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.count.mockResolvedValue(5);

      const result = await repository.count(tenantId);

      expect(result).toBe(5);
      expect(mockPrismaClient.alert.count).toHaveBeenCalledWith({
        where: {
          customerId: 'tenant-1'
        }
      });
    });

    it('should apply time range filter to count', async () => {
      const tenantId = CustomerId.create('tenant-1');
      const timeRange = TimeRange.createLastHour();

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.count.mockResolvedValue(3);

      const result = await repository.count(tenantId, timeRange);

      expect(result).toBe(3);
      expect(mockPrismaClient.alert.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          customerId: 'tenant-1',
          createdAt: expect.any(Object)
        })
      });
    });
  });

  describe('delete', () => {
    it('should delete alert', async () => {
      const tenantId = CustomerId.create('tenant-1');

      mockTenantValidator.validateTenantAccess.mockImplementation(() => {});
      mockPrismaClient.alert.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete(AlertId.create('alert-1'), tenantId);

      expect(mockPrismaClient.alert.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
          customerId: 'tenant-1'
        }
      });
    });

    it('should throw error when tenant validation fails', async () => {
      const tenantId = CustomerId.create('tenant-1');
      mockTenantValidator.validateTenantAccess.mockImplementation(() => {
        throw new Error('Tenant access denied');
      });

      await expect(repository.delete(AlertId.create('alert-1'), tenantId)).rejects.toThrow('Tenant access denied');
    });
  });

  describe('severity mapping', () => {
    it('should map domain severity to Prisma severity', () => {
      const repo = repository as any;

      expect(repo.mapToPrismaSeverity(AlertSeverity.create('LOW'))).toBe('INFO');
      expect(repo.mapToPrismaSeverity(AlertSeverity.create('MEDIUM'))).toBe('WARNING');
      expect(repo.mapToPrismaSeverity(AlertSeverity.create('HIGH'))).toBe('WARNING');
      expect(repo.mapToPrismaSeverity(AlertSeverity.create('CRITICAL'))).toBe('CRITICAL');
    });

    it('should map Prisma severity to domain severity', () => {
      const repo = repository as any;

      expect(repo.mapToDomainSeverity('INFO')).toBe('info');
      expect(repo.mapToDomainSeverity('WARNING')).toBe('warning');
      expect(repo.mapToDomainSeverity('CRITICAL')).toBe('critical');
      expect(repo.mapToDomainSeverity('ERROR')).toBe('emergency');
    });
  });
});
