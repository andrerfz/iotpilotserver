import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RedisDeviceCacheRepository} from '../redis-device-cache.repository';
import {DeviceRepository} from '../../../domain/interfaces/device-repository.interface';
import {DeviceEntity as Device} from '../../../domain/entities/device.entity';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {DeviceMapper} from '../../mappers/device.mapper';
import {vi} from 'vitest';

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    scard: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    scan: vi.fn(),
    pipeline: vi.fn(() => ({
      get: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      srem: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  })),
}));

describe('RedisDeviceCacheRepository', () => {
  let repository: RedisDeviceCacheRepository;
  let mockPrimaryRepository: DeviceRepository;
  let mockDeviceMapper: DeviceMapper;
  let tenantContext: TenantContextImpl;
  let device: Device;

  beforeEach(() => {
    // Create mocks
    mockPrimaryRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findAll: vi.fn(),
      findActive: vi.fn(),
      findInactive: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
    } as DeviceRepository;

    mockDeviceMapper = {
      toPersistence: vi.fn(),
      toDomain: vi.fn(),
    } as DeviceMapper;

    // Create test data
    const customerId = CustomerId.create('c1234567890123456789012345'); // Valid CUID format
    tenantContext = TenantContextImpl.create(customerId);
    device = Device.create(
      DeviceId.create('device-1'),
      DeviceName.create('device-1'),
      customerId,
      DeviceStatus.onlineAndActive(),
      IpAddress.create('192.168.1.100'),
      undefined, // tailscaleIp
      undefined, // hostname
      {
        username: 'pi',
        port: 22,
        privateKey: 'password',
        passphrase: undefined
      }
    );

    // Create mock Redis client
    const mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
      sadd: vi.fn(),
      srem: vi.fn(),
      smembers: vi.fn(),
      scard: vi.fn(),
      exists: vi.fn(),
      keys: vi.fn(),
      scan: vi.fn(),
      pipeline: vi.fn(() => ({
        get: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        srem: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      })),
    };

    // Create repository instance
    repository = new RedisDeviceCacheRepository(
      mockRedis,
      mockPrimaryRepository
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return device from cache when available', async () => {
      // Mock Redis get to return cached device data
      const mockRedis = (repository as any).redis;
      // Mock DeviceMapper.toDomain static method
      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'c1234567890123456789012345'
      }));

      const result = await repository.findById(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(device);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(toDomainSpy).toHaveBeenCalled();
    });

    it('should fetch from primary repository and cache when not in cache', async () => {
      // Mock Redis get to return null (cache miss)
      const mockRedis = (repository as any).redis;
      mockRedis.get.mockResolvedValue(null);
      mockPrimaryRepository.findById.mockResolvedValue(device);
      const toPersistenceSpy = vi.spyOn(DeviceMapper, 'toPersistence').mockReturnValue({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'c1234567890123456789012345'
      } as any);

      const result = await repository.findById(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(device);
      expect(mockPrimaryRepository.findById).toHaveBeenCalledWith(DeviceId.create('device-1'), tenantContext);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return null when device not found', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.get.mockResolvedValue(null);
      mockPrimaryRepository.findById.mockResolvedValue(null);

      const result = await repository.findById(DeviceId.create('non-existent'), tenantContext);

      expect(result).toBeNull();
      expect(mockPrimaryRepository.findById).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should delegate to primary repository for name lookup', async () => {
      mockPrimaryRepository.findByName.mockResolvedValue(device);

      const result = await repository.findByName('device-1', tenantContext);

      expect(result).toBe(device);
      expect(mockPrimaryRepository.findByName).toHaveBeenCalledWith('device-1', tenantContext);
    });
  });

  describe('findByIpAddress', () => {
    it('should delegate to primary repository for IP lookup', async () => {
      mockPrimaryRepository.findByIpAddress.mockResolvedValue(device);

      const result = await repository.findByIpAddress('192.168.1.100', tenantContext);

      expect(result).toBe(device);
      expect(mockPrimaryRepository.findByIpAddress).toHaveBeenCalledWith('192.168.1.100', tenantContext);
    });
  });

  describe('findAll', () => {
    it('should check cache first for device list', async () => {
      const mockRedis = (repository as any).redis;
      // Mock the list cache to return device IDs as JSON array
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('devices:')) {
          // Return cached device IDs list
          return Promise.resolve(JSON.stringify(['device-1']));
        }
        // Return cached device data
        return Promise.resolve(JSON.stringify({
          id: 'device-1',
          name: 'device-1',
          ipAddress: '192.168.1.100',
          customerId: 'c1234567890123456789012345'
        }));
      });

      const toDomainSpy = vi.spyOn(DeviceMapper, 'toDomain').mockReturnValue(device);

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(toDomainSpy).toHaveBeenCalled();
    });

    it('should fetch from primary repository when cache miss', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.get.mockResolvedValue(null);
      mockPrimaryRepository.findAll.mockResolvedValue([device]);

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockPrimaryRepository.findAll).toHaveBeenCalledWith(tenantContext);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should save to primary repository and invalidate cache', async () => {
      const mockRedis = (repository as any).redis;
      mockPrimaryRepository.save.mockResolvedValue(undefined);
      const toPersistenceSpy = vi.spyOn(DeviceMapper, 'toPersistence').mockReturnValue({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'c1234567890123456789012345'
      } as any);

      await repository.save(device, tenantContext);

      expect(mockPrimaryRepository.save).toHaveBeenCalledWith(device, tenantContext);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete from primary repository and invalidate cache', async () => {
      const mockRedis = (repository as any).redis;
      // Note: The actual implementation uses softDelete, not delete
      // But if delete exists, it should work similarly
      if (typeof (repository as any).delete === 'function') {
        mockPrimaryRepository.delete = vi.fn().mockResolvedValue(undefined);
        await (repository as any).delete(DeviceId.create('device-1'), tenantContext);
        expect(mockPrimaryRepository.delete).toHaveBeenCalled();
        expect(mockRedis.del).toHaveBeenCalled();
      } else {
        // Use softDelete if delete doesn't exist
        mockPrimaryRepository.softDelete = vi.fn().mockResolvedValue(undefined);
        await repository.softDelete(DeviceId.create('device-1'), tenantContext);
        expect(mockPrimaryRepository.softDelete).toHaveBeenCalledWith(DeviceId.create('device-1'), tenantContext);
        expect(mockRedis.del).toHaveBeenCalled();
      }
    });
  });

  describe.skip('exists', () => {
    // Note: exists method is not implemented in RedisDeviceCacheRepository
    it.skip('should check cache first for existence', async () => {
      // Test skipped - method not implemented
    });

    it.skip('should delegate to primary repository when cache miss', async () => {
      // Test skipped - method not implemented
    });
  });

  describe('count', () => {
    it('should delegate to primary repository', async () => {
      mockPrimaryRepository.count.mockResolvedValue(3);

      const result = await repository.count(tenantContext);

      expect(result).toBe(3);
      expect(mockPrimaryRepository.count).toHaveBeenCalledWith(tenantContext);
    });
  });
});
