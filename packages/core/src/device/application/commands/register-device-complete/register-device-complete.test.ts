import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DeviceRegistrationData, RegisterDeviceCompleteCommand} from './register-device-complete.command';
import {RegisterDeviceCompleteHandler} from './register-device-complete.handler';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {Device} from '@iotpilot/core/device/domain/entities/device.entity';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

describe('RegisterDeviceCompleteCommand', () => {
  describe('create', () => {
    const validDeviceData: DeviceRegistrationData = {
      deviceId: 'device-123',
      hostname: 'test-device',
      deviceType: 'raspberry-pi',
      architecture: 'arm64',
      customerId: 'c1234567890123456789012345',
      ipAddress: '192.168.1.100'
    };

    it('should create a valid command with complete device data', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345')); // Valid CUID format
      const command = RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext);

      expect(command.deviceData).toEqual(validDeviceData);
      expect(command.tenantContext).toBe(tenantContext);
    });

    it('should throw error when tenant context is missing', () => {
      expect(() => RegisterDeviceCompleteCommand.create(validDeviceData, null as any))
        .toThrow('Tenant context is required');
    });

    it('should throw error when device ID is empty', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const invalidData = { ...validDeviceData, deviceId: '' };

      expect(() => RegisterDeviceCompleteCommand.create(invalidData, tenantContext))
        .toThrow('Device ID is required');
    });

    it('should throw error when hostname is empty', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const invalidData = { ...validDeviceData, hostname: '' };

      expect(() => RegisterDeviceCompleteCommand.create(invalidData, tenantContext))
        .toThrow('Hostname is required');
    });

    it('should throw error when device type is empty', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const invalidData = { ...validDeviceData, deviceType: '' };

      expect(() => RegisterDeviceCompleteCommand.create(invalidData, tenantContext))
        .toThrow('Device type is required');
    });

    it('should throw error when architecture is empty', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const invalidData = { ...validDeviceData, architecture: '' };

      expect(() => RegisterDeviceCompleteCommand.create(invalidData, tenantContext))
        .toThrow('Architecture is required');
    });

    it('should throw error when customer ID is empty', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const invalidData = { ...validDeviceData, customerId: '' };

      expect(() => RegisterDeviceCompleteCommand.create(invalidData, tenantContext))
        .toThrow('Customer ID is required');
    });

    it('should throw error for tenant access violation', () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c9876543210987654321098765'));
      
      expect(() => RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext))
        .toThrow('Tenant access violation: Cannot register device for different customer');
    });

    it('should allow SUPERADMIN to register for any customer', () => {
      const tenantContext = TenantContextImpl.createSuperAdmin();
      
      expect(() => RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext))
        .not.toThrow();
    });
  });
});

describe('RegisterDeviceCompleteHandler', () => {
  let handler: RegisterDeviceCompleteHandler;
  let mockDeviceRepository: jest.Mocked<DeviceRepository>;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockDeviceRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    } as any;

    mockPrismaClient = {
      device: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      }
    } as any;

    const mockPrismaService = {
      getClient: () => mockPrismaClient
    } as unknown as PrismaService;
    handler = new RegisterDeviceCompleteHandler(mockDeviceRepository, mockPrismaService);
  });

  describe('handle', () => {
    const validDeviceData: DeviceRegistrationData = {
      deviceId: 'device-123',
      hostname: 'test-device',
      deviceType: 'raspberry-pi',
      deviceModel: 'Pi 4 Model B',
      architecture: 'arm64',
      location: 'Office',
      ipAddress: '192.168.1.100',
      tailscaleIp: '100.64.1.100',
      macAddress: '00:11:22:33:44:55',
      ownerId: 'user-123',
      customerId: 'c1234567890123456789012345'
    };

    it('should register a new device successfully', async () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const command = RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext);

      const mockDevice = { id: { getValue: () => 'device-id-123' }, deviceId: { getValue: () => 'device-123' } } as any;

      mockPrismaClient.device.findFirst.mockResolvedValue(null);
      mockDeviceRepository.create.mockResolvedValue(mockDevice);

      const result = await handler.handle(command);

      expect(result).toEqual({
        deviceId: 'device-123',
        message: 'Device registered successfully',
        capabilities: expect.arrayContaining(['ssh', 'gpio', 'camera', 'sensors', 'remote-access', 'vpn'])
      });

      expect(mockDeviceRepository.save).toHaveBeenCalledWith(
        expect.anything(),
        tenantContext
      );
    });

    it('should restore a soft-deleted device', async () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const command = RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext);

      const existingDevice = {
        id: 'device-id-123',
        deviceId: 'device-123',
        deletedAt: new Date()
      };

      const restoredDevice = {
        deviceId: 'device-123'
      };

      mockPrismaClient.device.findFirst.mockResolvedValue(existingDevice as any);
      mockPrismaClient.device.update.mockResolvedValue(restoredDevice as any);

      const result = await handler.handle(command);

      expect(result).toEqual({
        deviceId: 'device-123',
        message: 'Device restored successfully',
        capabilities: []
      });

      expect(mockPrismaClient.device.update).toHaveBeenCalledWith({
        where: { id: 'device-id-123' },
        data: expect.objectContaining({
          hostname: 'test-device',
          deviceType: 'GENERIC',
          status: 'ONLINE',
          deletedAt: null,
          deviceModel: 'Pi 4 Model B',
          architecture: 'arm64',
          location: 'Office',
          ipAddress: '192.168.1.100',
          tailscaleIp: '100.64.1.100',
          macAddress: '00:11:22:33:44:55',
          userId: 'user-123',
          customerId: 'c1234567890123456789012345'
        })
      });
    });

    it('should throw error when device already exists and is active', async () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const command = RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext);

      const existingDevice = {
        id: 'device-id-123',
        deviceId: 'device-123',
        deletedAt: null
      };

      mockPrismaClient.device.findFirst.mockResolvedValue(existingDevice as any);

      await expect(handler.handle(command)).rejects.toThrow('Device with ID device-123 already exists');
    });

    it('should handle errors gracefully', async () => {
      const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
      const command = RegisterDeviceCompleteCommand.create(validDeviceData, tenantContext);

      mockPrismaClient.device.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(handler.handle(command)).rejects.toThrow('Database error');
    });

    it('should detect capabilities correctly for different device types', async () => {
      const testCases = [
        { deviceType: 'raspberry-pi', expected: ['ssh', 'gpio', 'camera', 'sensors', 'remote-access', 'vpn'] },
        { deviceType: 'linux-server', expected: ['ssh', 'docker', 'monitoring', 'remote-access', 'vpn'] },
        { deviceType: 'iot-device', expected: ['sensors', 'mqtt', 'remote-access', 'vpn'] },
        { deviceType: 'unknown', expected: ['basic', 'remote-access', 'vpn'] }
      ];

      for (const testCase of testCases) {
        const deviceData = { ...validDeviceData, deviceType: testCase.deviceType };
        const tenantContext = TenantContextImpl.create(CustomerId.create('c1234567890123456789012345'));
        const command = RegisterDeviceCompleteCommand.create(deviceData, tenantContext);

        const mockDevice = { id: { getValue: () => 'device-id-123' }, deviceId: { getValue: () => 'device-123' } } as any;

        mockPrismaClient.device.findFirst.mockResolvedValue(null);
        mockDeviceRepository.create.mockResolvedValue(mockDevice);

        const result = await handler.handle(command);

        expect(result.capabilities).toEqual(expect.arrayContaining(testCase.expected));
      }
    });
  });
});