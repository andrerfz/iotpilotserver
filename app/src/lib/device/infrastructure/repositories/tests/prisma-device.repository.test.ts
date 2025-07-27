import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaDeviceRepository} from '../prisma-device.repository';
import {Device} from '../../../domain/entities/device.entity';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceMapper} from '../../mappers/device.mapper';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

// Mock tenantPrisma
const mockPrismaClient = {
  device: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('@/lib/tenant-middleware', () => ({
  tenantPrisma: mockTenantPrismaClient,
}));

describe('PrismaDeviceRepository', () => {
  let repository: PrismaDeviceRepository;
  let mockPrismaService: PrismaService;
  let mockDeviceMapper: DeviceMapper;
  let tenantContext: TenantContext;
  let device: Device;

  beforeEach(() => {
    mockPrismaService = {
      getClient: vi.fn().mockReturnValue(mockPrismaClient),
    } as unknown as PrismaService;

    mockDeviceMapper = {
      toDomain: vi.fn(),
      toPersistence: vi.fn(),
    } as DeviceMapper;

    repository = new PrismaDeviceRepository(mockPrismaService, undefined);

    tenantContext = TenantContext.create(CustomerId.create('tenant-1'));
    device = Device.create(
      DeviceId.create('device-1'),
      DeviceName.create('device-1'),
      IpAddress.create('192.168.1.100'),
      SshCredentials.create('pi', 'password'),
      CustomerId.create('tenant-1')
    );

    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      const deviceId = DeviceId.create('device-1');
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue(deviceData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findById(deviceId, tenantContext);

      expect(result).toBe(device);
      expect(mockTenantPrismaClient.client.device.findUnique).toHaveBeenCalledWith({
        where: { id: deviceId.getValue() }
      });
      expect(mockDeviceMapper.toDomain).toHaveBeenCalledWith(deviceData);
    });

    it('should return null when device not found', async () => {
      const deviceId = DeviceId.create('non-existent');

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue(null);

      const result = await repository.findById(deviceId, tenantContext);

      expect(result).toBeNull();
      expect(mockDeviceMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should return device when found with tenant filtering', async () => {
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findFirst.mockResolvedValue(deviceData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findByName('device-1', tenantContext);

      expect(result).toBe(device);
      expect(mockTenantPrismaClient.client.device.findFirst).toHaveBeenCalledWith({
        where: {
          hostname: 'device-1',
          customerId: tenantContext.getCustomerId()?.getValue()
        }
      });
    });

    it('should return device without tenant filtering for super admin', async () => {
      const superAdminContext = TenantContext.superAdmin();
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findFirst.mockResolvedValue(deviceData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findByName('device-1', superAdminContext);

      expect(result).toBe(device);
      expect(mockTenantPrismaClient.client.device.findFirst).toHaveBeenCalledWith({
        where: {
          hostname: 'device-1'
        }
      });
    });

    it('should return null when device not found', async () => {
      mockTenantPrismaClient.client.device.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('non-existent', tenantContext);

      expect(result).toBeNull();
    });
  });

  describe('findByIpAddress', () => {
    it('should return device when found with tenant filtering', async () => {
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findFirst.mockResolvedValue(deviceData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findByIpAddress('192.168.1.100', tenantContext);

      expect(result).toBe(device);
      expect(mockTenantPrismaClient.client.device.findFirst).toHaveBeenCalledWith({
        where: {
          ipAddress: '192.168.1.100',
          customerId: tenantContext.getCustomerId()?.getValue()
        }
      });
    });

    it('should return null when device not found', async () => {
      mockTenantPrismaClient.client.device.findFirst.mockResolvedValue(null);

      const result = await repository.findByIpAddress('192.168.1.999', tenantContext);

      expect(result).toBeNull();
    });
  });

  describe('findActive', () => {
    it('should return active devices with tenant filtering', async () => {
      const devicesData = [
        { id: 'device-1', hostname: 'device-1', status: 'active' }
      ];

      mockTenantPrismaClient.client.device.findMany.mockResolvedValue(devicesData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findActive(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockTenantPrismaClient.client.device.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('findInactive', () => {
    it('should return inactive devices with tenant filtering', async () => {
      const devicesData = [
        { id: 'device-1', hostname: 'device-1', status: 'inactive' }
      ];

      mockTenantPrismaClient.client.device.findMany.mockResolvedValue(devicesData);
      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findInactive(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockTenantPrismaClient.client.device.findMany).toHaveBeenCalledWith({
        where: {
          status: 'inactive',
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('findAll', () => {
    it('should return all devices with tenant filtering', async () => {
      const devicesData = [
        { id: 'device-1', hostname: 'device-1' },
        { id: 'device-2', hostname: 'device-2' }
      ];

      mockTenantPrismaClient.client.device.findMany.mockResolvedValue(devicesData);
      mockDeviceMapper.toDomain.mockImplementation((data) => {
        if (data.id === 'device-1') return device;
        return Device.create(
          DeviceId.create('device-2'),
          DeviceName.create('device-2'),
          IpAddress.create('192.168.1.101'),
          SshCredentials.create('pi', 'password'),
          CustomerId.create('tenant-1')
        );
      });

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(2);
      expect(mockTenantPrismaClient.client.device.findMany).toHaveBeenCalledWith({
        where: {
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('save', () => {
    it('should create new device', async () => {
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue(null);
      mockDeviceMapper.toPersistence.mockReturnValue(deviceData);
      mockTenantPrismaClient.client.device.create.mockResolvedValue(deviceData);

      await repository.save(device);

      expect(mockTenantPrismaClient.client.device.create).toHaveBeenCalledWith({
        data: deviceData
      });
    });

    it('should update existing device', async () => {
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue(deviceData);
      mockDeviceMapper.toPersistence.mockReturnValue(deviceData);
      mockTenantPrismaClient.client.device.update.mockResolvedValue(deviceData);

      await repository.save(device);

      expect(mockTenantPrismaClient.client.device.update).toHaveBeenCalledWith({
        where: { id: device.id.getValue() },
        data: deviceData
      });
    });
  });

  describe('delete', () => {
    it('should delete device', async () => {
      const deviceId = DeviceId.create('device-1');

      mockTenantPrismaClient.client.device.delete.mockResolvedValue({
        id: 'device-1',
        hostname: 'device-1'
      });

      await repository.delete(deviceId);

      expect(mockTenantPrismaClient.client.device.delete).toHaveBeenCalledWith({
        where: { id: deviceId.getValue() }
      });
    });
  });

  describe('exists', () => {
    it('should return true when device exists', async () => {
      const deviceId = DeviceId.create('device-1');

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue({
        id: 'device-1',
        hostname: 'device-1'
      });

      const result = await repository.exists(deviceId, tenantContext);

      expect(result).toBe(true);
    });

    it('should return false when device does not exist', async () => {
      const deviceId = DeviceId.create('non-existent');

      mockTenantPrismaClient.client.device.findUnique.mockResolvedValue(null);

      const result = await repository.exists(deviceId, tenantContext);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return device count with tenant filtering', async () => {
      mockTenantPrismaClient.client.device.count.mockResolvedValue(5);

      const result = await repository.count(tenantContext);

      expect(result).toBe(5);
      expect(mockTenantPrismaClient.client.device.count).toHaveBeenCalledWith({
        where: {
          customerId: tenantContext.getCustomerId()?.getValue()
        }
      });
    });
  });
});
