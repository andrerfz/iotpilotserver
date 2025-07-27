import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RedisDeviceCacheRepository} from '../redis-device-cache.repository';
import {DeviceRepository} from '../../../domain/interfaces/device-repository.interface';
import {Device} from '../../../domain/entities/device.entity';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {DeviceMapper} from '../../mappers/device.mapper';

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
  let tenantContext: TenantContext;
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
    tenantContext = TenantContext.create(CustomerId.create('tenant-1'));
    device = Device.create(
      DeviceId.create('device-1'),
      DeviceName.create('device-1'),
      IpAddress.create('192.168.1.100'),
      SshCredentials.create('pi', 'password'),
      CustomerId.create('tenant-1')
    );

    // Create repository instance
    repository = new RedisDeviceCacheRepository(
      mockDeviceMapper,
      mockPrimaryRepository,
      'redis://localhost:6379'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return device from cache when available', async () => {
      // Mock Redis get to return cached device data
      const mockRedis = (repository as any).redis;
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1'
      }));

      mockDeviceMapper.toDomain.mockReturnValue(device);

      const result = await repository.findById(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(device);
      expect(mockRedis.get).toHaveBeenCalledWith('device:device-1');
      expect(mockDeviceMapper.toDomain).toHaveBeenCalled();
    });

    it('should fetch from primary repository and cache when not in cache', async () => {
      // Mock Redis get to return null (cache miss)
      const mockRedis = (repository as any).redis;
      mockRedis.get.mockResolvedValue(null);
      mockPrimaryRepository.findById.mockResolvedValue(device);
      mockDeviceMapper.toPersistence.mockReturnValue({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1'
      });

      const result = await repository.findById(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(device);
      expect(mockPrimaryRepository.findById).toHaveBeenCalledWith(DeviceId.create('device-1'), tenantContext);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalledWith('device:device-1', 3600);
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
      mockRedis.smembers.mockResolvedValue(['device-1', 'device-2']);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1'
      }));

      mockDeviceMapper.toDomain.mockReturnValue(device);
      mockPrimaryRepository.findAll.mockResolvedValue([device]);

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockRedis.smembers).toHaveBeenCalledWith('tenant:tenant-1:devices');
    });

    it('should fetch from primary repository when cache miss', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.smembers.mockResolvedValue([]);
      mockPrimaryRepository.findAll.mockResolvedValue([device]);
      mockDeviceMapper.toPersistence.mockReturnValue({
        id: 'device-1',
        name: 'device-1',
        ipAddress: '192.168.1.100',
        customerId: 'tenant-1'
      });

      const result = await repository.findAll(tenantContext);

      expect(result).toHaveLength(1);
      expect(mockPrimaryRepository.findAll).toHaveBeenCalledWith(tenantContext);
      expect(mockRedis.sadd).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should save to primary repository and invalidate cache', async () => {
      const mockRedis = (repository as any).redis;
      mockPrimaryRepository.save.mockResolvedValue(undefined);

      await repository.save(device);

      expect(mockPrimaryRepository.save).toHaveBeenCalledWith(device);
      expect(mockRedis.del).toHaveBeenCalledWith('device:device-1');
      expect(mockRedis.srem).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete from primary repository and invalidate cache', async () => {
      const mockRedis = (repository as any).redis;
      mockPrimaryRepository.delete.mockResolvedValue(undefined);

      await repository.delete(DeviceId.create('device-1'));

      expect(mockPrimaryRepository.delete).toHaveBeenCalledWith(DeviceId.create('device-1'));
      expect(mockRedis.del).toHaveBeenCalledWith('device:device-1');
      expect(mockRedis.srem).toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should check cache first for existence', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.exists.mockResolvedValue(1);

      const result = await repository.exists(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('device:device-1');
    });

    it('should delegate to primary repository when cache miss', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.exists.mockResolvedValue(0);
      mockPrimaryRepository.exists.mockResolvedValue(true);

      const result = await repository.exists(DeviceId.create('device-1'), tenantContext);

      expect(result).toBe(true);
      expect(mockPrimaryRepository.exists).toHaveBeenCalledWith(DeviceId.create('device-1'), tenantContext);
    });
  });

  describe('count', () => {
    it('should check cache first for count', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.scard.mockResolvedValue(5);

      const result = await repository.count(tenantContext);

      expect(result).toBe(5);
      expect(mockRedis.scard).toHaveBeenCalledWith('tenant:tenant-1:devices');
    });

    it('should delegate to primary repository when cache miss', async () => {
      const mockRedis = (repository as any).redis;
      mockRedis.scard.mockResolvedValue(0);
      mockPrimaryRepository.count.mockResolvedValue(3);

      const result = await repository.count(tenantContext);

      expect(result).toBe(3);
      expect(mockPrimaryRepository.count).toHaveBeenCalledWith(tenantContext);
    });
  });
});
