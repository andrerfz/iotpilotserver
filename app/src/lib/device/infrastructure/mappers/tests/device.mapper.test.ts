import {describe, expect, it} from 'vitest';
import {DeviceMapper} from '../device.mapper';
import {Device} from '@/lib/device/domain/entities/device.entity';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@/lib/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@/lib/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@/lib/device/domain/value-objects/device-status.vo';
import {SshCredentials} from '@/lib/device/domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {CreateDeviceDTO, UpdateDeviceDTO} from '../../dto/device.dto';
import {DeviceRegistrationDTO} from '../../dto/device-registration.dto';

describe('DeviceMapper', () => {
  const mapper = new DeviceMapper();
  const testDate = new Date('2023-01-01T00:00:00.000Z');
  
  // Create test device
  const deviceId = DeviceId.create('device-123');
  const deviceName = DeviceName.create('test-device');
  const ipAddress = IpAddress.create('192.168.1.1');
  const status = DeviceStatus.create('active');
  const sshCredentials = SshCredentials.create('user', 'password', 'private-key');
  const customerId = CustomerId.create('customer-123');
  
  const device = new Device(
    deviceId,
    deviceName,
    ipAddress,
    status,
    sshCredentials,
    testDate,
    testDate,
    customerId
  );
  
  // Create test Prisma model
  const prismaDevice = {
    id: 'device-123',
    name: 'test-device',
    ipAddress: '192.168.1.1',
    status: 'active',
    sshUsername: 'user',
    sshPassword: 'password',
    sshPrivateKey: 'private-key',
    createdAt: testDate,
    updatedAt: testDate,
    customerId: 'customer-123'
  };
  
  describe('toDomain', () => {
    it('should convert Prisma model to domain entity', () => {
      // Act
      const result = mapper.toDomain(prismaDevice);
      
      // Assert
      expect(result).toBeInstanceOf(Device);
      // The ID is preserved from the Prisma model
      expect(result.id.getValue()).toBe(prismaDevice.id);
      expect(result.name.getValue()).toBe('test-device');
      expect(result.ipAddress.getValue()).toBe('192.168.1.1');
      expect(result.status.getValue()).toBe('active');
      expect(result.sshCredentials.getUsername()).toBe('user');
      expect(result.sshCredentials.getPassword()).toBe('password');
      expect(result.sshCredentials.getPrivateKey()).toBe('private-key');
      expect(result.createdAt).toEqual(testDate);
      expect(result.updatedAt).toEqual(testDate);
      expect(result.getTenantId().getValue()).toBe('customer-123');
    });
    
    it('should throw an error if customerId is missing', () => {
      // Arrange
      const invalidPrismaDevice = { ...prismaDevice, customerId: null };
      
      // Act & Assert
      expect(() => mapper.toDomain(invalidPrismaDevice)).toThrow(`Device ${prismaDevice.id} has no customer ID`);
    });
  });
  
  describe('toPersistence', () => {
    it('should convert domain entity to Prisma model', () => {
      // Act
      const result = mapper.toPersistence(device);
      
      // Assert
      expect(result).toEqual({
        id: 'device-123',
        name: 'test-device',
        ipAddress: '192.168.1.1',
        status: 'active',
        sshUsername: 'user',
        sshPassword: 'password',
        sshPrivateKey: 'private-key',
        createdAt: testDate,
        updatedAt: testDate,
        customer: {
          connect: {
            id: 'customer-123'
          }
        }
      });
    });
  });
  
  describe('toDTO', () => {
    it('should convert domain entity to DTO', () => {
      // Act
      const result = mapper.toDTO(device);
      
      // Assert
      expect(result).toEqual({
        id: 'device-123',
        name: 'test-device',
        ipAddress: '192.168.1.1',
        status: 'active',
        sshUsername: 'user',
        sshPassword: 'password',
        sshPrivateKey: 'private-key',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
        customerId: 'customer-123'
      });
    });
  });
  
  describe('toListItemDTO', () => {
    it('should convert domain entity to list item DTO', () => {
      // Act
      const result = mapper.toListItemDTO(device);
      
      // Assert
      expect(result).toEqual({
        id: 'device-123',
        name: 'test-device',
        ipAddress: '192.168.1.1',
        status: 'active',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString()
      });
    });
  });
  
  describe('toDetailsDTO', () => {
    it('should convert domain entity to details DTO without metrics', () => {
      // Act
      const result = mapper.toDetailsDTO(device);
      
      // Assert
      expect(result).toEqual({
        id: 'device-123',
        name: 'test-device',
        ipAddress: '192.168.1.1',
        status: 'active',
        sshUsername: 'user',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
        customerId: 'customer-123',
        hasPassword: true,
        hasPrivateKey: true
      });
    });
    
    it('should convert domain entity to details DTO with metrics', () => {
      // Arrange
      const metrics = {
        cpuUsage: 50,
        memoryUsage: 60,
        diskUsage: 70,
        temperature: 40,
        networkTraffic: 1000,
        timestamp: testDate
      };
      
      // Act
      const result = mapper.toDetailsDTO(device, metrics);
      
      // Assert
      expect(result).toEqual({
        id: 'device-123',
        name: 'test-device',
        ipAddress: '192.168.1.1',
        status: 'active',
        sshUsername: 'user',
        createdAt: testDate.toISOString(),
        updatedAt: testDate.toISOString(),
        customerId: 'customer-123',
        hasPassword: true,
        hasPrivateKey: true,
        metrics: {
          cpuUsage: 50,
          memoryUsage: 60,
          diskUsage: 70,
          temperature: 40,
          networkTraffic: 1000,
          lastUpdated: testDate.toISOString()
        }
      });
    });
  });
  
  describe('fromCreateDTO', () => {
    it('should convert create DTO to domain entity', () => {
      // Arrange
      const createDTO: CreateDeviceDTO = {
        name: 'new-device',
        ipAddress: '192.168.1.2',
        sshUsername: 'user2',
        sshPassword: 'password2',
        customerId: 'customer-456'
      };
      
      // Act
      const result = mapper.fromCreateDTO(createDTO);
      
      // Assert
      expect(result).toBeInstanceOf(Device);
      expect(result.name.getValue()).toBe('new-device');
      expect(result.ipAddress.getValue()).toBe('192.168.1.2');
      expect(result.sshCredentials.getUsername()).toBe('user2');
      expect(result.sshCredentials.getPassword()).toBe('password2');
      expect(result.getTenantId().getValue()).toBe('customer-456');
    });
  });
  
  describe('applyUpdateDTO', () => {
    it('should apply update DTO to domain entity', () => {
      // Arrange
      const updateDTO: UpdateDeviceDTO = {
        name: 'updated-device',
        ipAddress: '192.168.1.3',
        status: 'inactive',
        sshUsername: 'user3',
        sshPassword: 'password3'
      };
      
      // Act
      const result = mapper.applyUpdateDTO(device, updateDTO);
      
      // Assert
      expect(result).toBe(device); // Should return the same instance
      expect(result.name.getValue()).toBe('updated-device');
      expect(result.ipAddress.getValue()).toBe('192.168.1.3');
      expect(result.status.getValue()).toBe('inactive');
      expect(result.sshCredentials.getUsername()).toBe('user3');
      expect(result.sshCredentials.getPassword()).toBe('password3');
      expect(result.sshCredentials.getPrivateKey()).toBe('private-key'); // Unchanged
    });
    
    it('should only update provided fields', () => {
      // Arrange
      const updateDTO: UpdateDeviceDTO = {
        name: 'partially-updated-device'
      };
      
      // Create a fresh device to test with
      const freshDevice = new Device(
        deviceId,
        deviceName,
        ipAddress,
        status,
        sshCredentials,
        testDate,
        testDate,
        customerId
      );
      
      // Act
      const result = mapper.applyUpdateDTO(freshDevice, updateDTO);
      
      // Assert
      expect(result.name.getValue()).toBe('partially-updated-device');
      expect(result.ipAddress.getValue()).toBe('192.168.1.1'); // Unchanged
      expect(result.status.getValue()).toBe('active'); // Unchanged
      expect(result.sshCredentials.getUsername()).toBe('user'); // Unchanged
    });
  });
  
  describe('fromRegistrationDTO', () => {
    it('should convert registration DTO to domain entity', () => {
      // Arrange
      const registrationDTO: DeviceRegistrationDTO = {
        name: 'registered-device',
        ipAddress: '192.168.1.4',
        sshUsername: 'user4',
        sshPassword: 'password4',
        customerId: 'customer-789',
        registrationToken: 'token-123',
        deviceType: 'raspberry-pi',
        tags: ['test', 'iot'],
        description: 'Test device'
      };
      
      // Act
      const result = mapper.fromRegistrationDTO(registrationDTO);
      
      // Assert
      expect(result).toBeInstanceOf(Device);
      expect(result.name.getValue()).toBe('registered-device');
      expect(result.ipAddress.getValue()).toBe('192.168.1.4');
      expect(result.sshCredentials.getUsername()).toBe('user4');
      expect(result.sshCredentials.getPassword()).toBe('password4');
      expect(result.getTenantId().getValue()).toBe('customer-789');
    });
  });
});