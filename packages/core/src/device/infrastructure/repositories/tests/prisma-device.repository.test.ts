import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaDeviceRepository} from '../prisma-device.repository';
import {DeviceEntity as Device} from '../../../domain/entities/device.entity';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceMapper} from '../../mappers/device.mapper';
import * as DeviceMapperModule from '../../mappers/device.mapper';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

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

const mockTenantPrismaClient = {
  client: mockPrismaClient,
};

vi.mock('@iotpilot/core/tenant-middleware', () => ({
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

    tenantContext = TenantContextImpl.create(CustomerId.create('ctenant10000000000000000001'));
    device = Device.create(
      DeviceId.create('device-1'),
      DeviceName.create('device-1'),
      CustomerId.create('ctenant10000000000000000001'),
      undefined, // status - defaults to offlineInactive
      IpAddress.create('192.168.1.100'),
      undefined, // tailscaleIp
      undefined, // hostname
      SshCredentials.create('pi', 'password')
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
        customerId: 'ctenant10000000000000000001',
        metrics: [],
      };

      mockPrismaClient.device.findFirst.mockResolvedValue(deviceData);
      // Mock DeviceMapper.toDomain static method
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findById(deviceId, tenantContext);

      expect(result).toBe(device);
      expect(mockPrismaClient.device.findFirst).toHaveBeenCalledWith({
        where: { id: deviceId.getValue(), deletedAt: null, customerId: tenantContext.getCustomerId()?.getValue() },
        include: { metrics: true }
      });
      expect(toDomainSpy).toHaveBeenCalledWith(deviceData, tenantContext);
    });

    it('should return null when device not found', async () => {
      const deviceId = DeviceId.create('non-existent');

      mockPrismaClient.device.findFirst.mockResolvedValue(null);

      const result = await repository.findById(deviceId, tenantContext);

      expect(result).toBeNull();
      expect(DeviceMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should return device when found with tenant filtering', async () => {
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'ctenant10000000000000000001',
      };

      mockPrismaClient.device.findFirst.mockResolvedValue(deviceData);
      // Mock DeviceMapper.toDomain static method
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findByName('device-1', tenantContext);

      expect(result).toBe(device);
      expect(mockPrismaClient.device.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'device-1',
          deletedAt: null,
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        include: {
          metrics: true
        }
      });
      expect(toDomainSpy).toHaveBeenCalledWith(deviceData, tenantContext);
    });

    it('should return device without tenant filtering for super admin', async () => {
      const superAdminContext = TenantContextImpl.createSuperAdmin();
      const deviceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1',
      };

      mockPrismaClient.device.findFirst.mockResolvedValue(deviceData);
      // Mock DeviceMapper.toDomain static method
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findByName('device-1', superAdminContext);

      expect(result).toBe(device);
      expect(mockPrismaClient.device.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'device-1',
          deletedAt: null
          // No customerId for superAdmin
        },
        include: {
          metrics: true
        }
      });
      expect(toDomainSpy).toHaveBeenCalledWith(deviceData, superAdminContext);
    });

    it('should return null when device not found', async () => {
      mockPrismaClient.device.findFirst.mockResolvedValue(null);

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

      mockPrismaClient.device.findFirst.mockResolvedValue(deviceData);
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);
      // Clear any previous calls
      toDomainSpy.mockClear();

      const result = await repository.findByIpAddress('192.168.1.100', tenantContext);

      expect(result).toBe(device);
      // Note: findByIpAddress returns null if device is null, so we need to ensure deviceData is not null
      expect(mockPrismaClient.device.findFirst).toHaveBeenCalledWith({
        where: {
          ipAddress: { contains: '192.168.1.100' },
          deletedAt: null,
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        include: {
          metrics: true
        }
      });
      expect(toDomainSpy).toHaveBeenCalledWith(deviceData, tenantContext);
    });

    it('should return null when device not found', async () => {
      vi.clearAllMocks();
      mockPrismaClient.device.findFirst.mockResolvedValue(null);
      // DeviceMapper.toDomain returns null when persistence is null
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(null);

      const result = await repository.findByIpAddress('192.168.1.999', tenantContext);

      expect(result).toBeNull();
      expect(toDomainSpy).toHaveBeenCalledWith(null, tenantContext);
    });
  });

  describe.skip('findActive', () => {
    it('should return active devices with tenant filtering', async () => {
      const devicesData = [
        { id: 'device-1', hostname: 'device-1', status: 'active' }
      ];

      mockPrismaClient.device.findMany.mockResolvedValue(devicesData);
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findActive(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.device.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe.skip('findInactive', () => {
    it('should return inactive devices with tenant filtering', async () => {
      const devicesData = [
        { id: 'device-1', hostname: 'device-1', status: 'inactive' }
      ];

      mockPrismaClient.device.findMany.mockResolvedValue(devicesData);
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findInactive(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockPrismaClient.device.findMany).toHaveBeenCalledWith({
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

      mockPrismaClient.device.findMany.mockResolvedValue(devicesData);
      const device2 = Device.create(
        DeviceId.create('device-2'),
        DeviceName.create('device-2'),
        CustomerId.create('ctenant10000000000000000001'),
        undefined, // status
        IpAddress.create('192.168.1.101'),
        undefined, // tailscaleIp
        undefined, // hostname
        SshCredentials.create('pi', 'password')
      );
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockImplementation((data) => {
        if (data.id === 'device-1') return device;
        return device2;
      });

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(2);
      expect(mockPrismaClient.device.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          customerId: tenantContext.getCustomerId()?.getValue()
        },
        include: {
          metrics: true
        },
        orderBy: { registeredAt: 'desc' }
      });
    });
  });

  describe('save', () => {
    it('should create new device', async () => {
      // Mock DeviceMapper.toPersistence to return data with id
      const persistenceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };
      const toPersistenceSpy = vi.spyOn(DeviceMapper, 'toPersistence').mockReturnValue(persistenceData);
      mockPrismaClient.device.upsert.mockResolvedValue({ ...persistenceData, customerId: tenantContext.getCustomerId()?.getValue() });

      await repository.save(device, tenantContext);

      // The code adds customerId from tenantContext and cleans undefined values
      expect(mockPrismaClient.device.upsert).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        update: expect.objectContaining({
          id: 'device-1',
          hostname: 'device-1',
          ipAddress: '192.168.1.100',
          customerId: tenantContext.getCustomerId()?.getValue(),
          updatedAt: expect.any(Date),
          capabilities: expect.any(Object) // SSH credentials are stored in capabilities
        }),
        create: expect.objectContaining({
          id: 'device-1',
          hostname: 'device-1',
          ipAddress: '192.168.1.100',
          customerId: tenantContext.getCustomerId()?.getValue(),
          capabilities: expect.any(Object)
        })
      });
      expect(toPersistenceSpy).toHaveBeenCalledWith(device);
    });

    it('should update existing device', async () => {
      // Mock DeviceMapper.toPersistence to return data with id
      const persistenceData = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };
      const toPersistenceSpy = vi.spyOn(DeviceMapper, 'toPersistence').mockReturnValue(persistenceData);
      mockPrismaClient.device.upsert.mockResolvedValue({ ...persistenceData, customerId: tenantContext.getCustomerId()?.getValue() });

      await repository.save(device, tenantContext);

      // The code adds customerId from tenantContext and cleans undefined values
      expect(mockPrismaClient.device.upsert).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        update: expect.objectContaining({
          id: 'device-1',
          hostname: 'device-1',
          ipAddress: '192.168.1.100',
          customerId: tenantContext.getCustomerId()?.getValue(),
          updatedAt: expect.any(Date),
          capabilities: expect.any(Object) // SSH credentials are stored in capabilities
        }),
        create: expect.objectContaining({
          id: 'device-1',
          hostname: 'device-1',
          ipAddress: '192.168.1.100',
          customerId: tenantContext.getCustomerId()?.getValue(),
          capabilities: expect.any(Object)
        })
      });
      expect(toPersistenceSpy).toHaveBeenCalledWith(device);
    });
  });

  describe.skip('delete', () => {
    it('should delete device', async () => {
      const deviceId = DeviceId.create('device-1');

      mockPrismaClient.device.delete.mockResolvedValue({
        id: 'device-1',
        hostname: 'device-1'
      });

      await repository.delete(deviceId);

      expect(mockPrismaClient.device.delete).toHaveBeenCalledWith({
        where: { id: deviceId.getValue() }
      });
    });
  });

  describe.skip('exists', () => {
    it('should return true when device exists', async () => {
      const deviceId = DeviceId.create('device-1');

      mockPrismaClient.device.findUnique.mockResolvedValue({
        id: 'device-1',
        hostname: 'device-1'
      });

      const result = await repository.exists(deviceId, tenantContext);

      expect(result).toBe(true);
    });

    it('should return false when device does not exist', async () => {
      const deviceId = DeviceId.create('non-existent');

      mockPrismaClient.device.findUnique.mockResolvedValue(null);

      const result = await repository.exists(deviceId, tenantContext);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return device count with tenant filtering', async () => {
      mockPrismaClient.device.count.mockResolvedValue(5);

      const result = await repository.count(tenantContext);

      expect(result).toBe(5);
      expect(mockPrismaClient.device.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          customerId: tenantContext.getCustomerId()?.getValue()
        }
      });
    });
  });
});
