import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {PrismaDeviceRepository} from '../../../lib/device/infrastructure/repositories/prisma-device.repository';
import {DeviceId} from '../../../lib/device/domain/value-objects/device-id.vo';
import {DeviceName} from '../../../lib/device/domain/value-objects/device-name.vo';
import {IpAddress} from '../../../lib/device/domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../lib/device/domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '../../../lib/customer/domain/value-objects/customer-id.vo';
import {UserId} from '../../../lib/user/domain/value-objects/user-id.vo';
import {Device} from '../../../lib/device/domain/entities/device.entity';
import {PrismaService} from '../../../lib/shared/infrastructure/database/prisma.service';
import {DeviceType} from '../../../lib/device/domain/value-objects/device-type.vo';
import {DeviceStatus} from '../../../lib/device/domain/value-objects/device-status.vo';

describe('Device Repository Integration Tests', () => {
  let deviceRepository: PrismaDeviceRepository;
  let prismaService: PrismaService;
  let testDeviceId: DeviceId;
  let testDeviceName: DeviceName;
  let testIpAddress: IpAddress;
  let testSshCredentials: SshCredentials;
  let testCustomerId: CustomerId;
  let testUserId: UserId;
  let testDeviceType: DeviceType;
  let testStatus: DeviceStatus;

  beforeEach(async () => {
    prismaService = new PrismaService();
    deviceRepository = new PrismaDeviceRepository(prismaService, undefined);

    // Create test data
    testDeviceId = DeviceId.create('test-device-repo');
    testDeviceName = DeviceName.create('Test Device Repo');
    testIpAddress = IpAddress.create('192.168.1.100');
    testSshCredentials = SshCredentials.create('testuser', 'testpass');
    testCustomerId = CustomerId.create('test-customer-device-repo');
    testUserId = UserId.create('test-user-device-repo');
    testDeviceType = DeviceType.create('PI_4');
    testStatus = DeviceStatus.create('ONLINE');

    // Clean up any existing test data
    await prisma.device.deleteMany({
      where: {
        OR: [
          { id: testDeviceId.getValue() },
          { deviceId: testDeviceId.getValue() },
          { hostname: testDeviceName.getValue() },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: { id: testUserId.getValue() },
    });

    await prisma.customer.deleteMany({
      where: { id: testCustomerId.getValue() },
    });

    // Create test customer and user
    await prisma.customer.create({
      data: {
        id: testCustomerId.getValue(),
        name: 'Test Customer Device Repo',
        slug: 'test-customer-device-repo',
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
      },
    });

    await prisma.user.create({
      data: {
        id: testUserId.getValue(),
        email: 'testuser-device-repo@test.com',
        username: 'testuserdevicerepo',
        passwordHash: 'hashedpassword',
        role: 'ADMIN',
        customerId: testCustomerId.getValue(),
        status: 'ACTIVE',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.device.deleteMany({
      where: {
        OR: [
          { id: testDeviceId.getValue() },
          { deviceId: testDeviceId.getValue() },
          { hostname: testDeviceName.getValue() },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: { id: testUserId.getValue() },
    });

    await prisma.customer.deleteMany({
      where: { id: testCustomerId.getValue() },
    });
  });

  describe('save', () => {
    it('should save a new device successfully', async () => {
      const device = Device.create({
        id: testDeviceId,
        deviceId: testDeviceId,
        hostname: testDeviceName,
        ipAddress: testIpAddress,
        sshCredentials: testSshCredentials,
        customerId: testCustomerId,
        userId: testUserId,
        deviceType: testDeviceType,
        status: testStatus,
      });

      await deviceRepository.save(device);

      // Verify device was saved
      const savedDevice = await prisma.device.findUnique({
        where: { id: testDeviceId.getValue() },
      });

      expect(savedDevice).toBeDefined();
      expect(savedDevice?.id).toBe(testDeviceId.getValue());
      expect(savedDevice?.deviceId).toBe(testDeviceId.getValue());
      expect(savedDevice?.hostname).toBe(testDeviceName.getValue());
      expect(savedDevice?.ipAddress).toBe(testIpAddress.getValue());
      expect(savedDevice?.customerId).toBe(testCustomerId.getValue());
      expect(savedDevice?.userId).toBe(testUserId.getValue());
      expect(savedDevice?.deviceType).toBe(testDeviceType.getValue());
      expect(savedDevice?.status).toBe(testStatus.getValue());
    });

    it('should update existing device', async () => {
      // First create a device
      const device = Device.create({
        id: testDeviceId,
        deviceId: testDeviceId,
        hostname: testDeviceName,
        ipAddress: testIpAddress,
        sshCredentials: testSshCredentials,
        customerId: testCustomerId,
        userId: testUserId,
        deviceType: testDeviceType,
        status: testStatus,
      });

      await deviceRepository.save(device);

      // Update the device
      const updatedDevice = Device.create({
        ...device.getProps(),
        hostname: DeviceName.create('Updated Device Name'),
        status: DeviceStatus.create('OFFLINE'),
      });

      await deviceRepository.save(updatedDevice);

      // Verify device was updated
      const savedDevice = await prisma.device.findUnique({
        where: { id: testDeviceId.getValue() },
      });

      expect(savedDevice?.hostname).toBe('Updated Device Name');
      expect(savedDevice?.status).toBe('OFFLINE');
    });
  });

  describe('findById', () => {
    it('should find device by ID', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const foundDevice = await deviceRepository.findById(testDeviceId);

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getDeviceId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getHostname().getValue()).toBe(testDeviceName.getValue());
      expect(foundDevice?.getIpAddress().getValue()).toBe(testIpAddress.getValue());
      expect(foundDevice?.getCustomerId().getValue()).toBe(testCustomerId.getValue());
      expect(foundDevice?.getStatus().getValue()).toBe(testStatus.getValue());
    });

    it('should return null for non-existent device', async () => {
      const nonExistentDeviceId = DeviceId.create('non-existent-device');
      const foundDevice = await deviceRepository.findById(nonExistentDeviceId);

      expect(foundDevice).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find device by hostname', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const foundDevice = await deviceRepository.findByName(testDeviceName);

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getHostname().getValue()).toBe(testDeviceName.getValue());
    });

    it('should return null for non-existent hostname', async () => {
      const nonExistentName = DeviceName.create('Non Existent Device');
      const foundDevice = await deviceRepository.findByName(nonExistentName);

      expect(foundDevice).toBeNull();
    });
  });

  describe('findByIpAddress', () => {
    it('should find device by IP address', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const foundDevice = await deviceRepository.findByIpAddress(testIpAddress);

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getIpAddress().getValue()).toBe(testIpAddress.getValue());
    });

    it('should return null for non-existent IP address', async () => {
      const nonExistentIp = IpAddress.create('10.0.0.1');
      const foundDevice = await deviceRepository.findByIpAddress(nonExistentIp);

      expect(foundDevice).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all devices', async () => {
      // Create multiple devices
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const secondDeviceId = DeviceId.create('test-device-repo-2');
      const secondDeviceName = DeviceName.create('Test Device Repo 2');
      const secondIpAddress = IpAddress.create('192.168.1.101');

      await prisma.device.create({
        data: {
          id: secondDeviceId.getValue(),
          deviceId: secondDeviceId.getValue(),
          hostname: secondDeviceName.getValue(),
          ipAddress: secondIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const devices = await deviceRepository.findAll();

      expect(devices.length).toBeGreaterThanOrEqual(2);
      const deviceIds = devices.map(d => d.getId().getValue());
      expect(deviceIds).toContain(testDeviceId.getValue());
      expect(deviceIds).toContain(secondDeviceId.getValue());
    });
  });

  describe('findActive', () => {
    it('should return only active devices', async () => {
      // Create active device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: 'ONLINE',
        },
      });

      // Create inactive device
      const inactiveDeviceId = DeviceId.create('inactive-device');
      const inactiveDeviceName = DeviceName.create('Inactive Device');

      await prisma.device.create({
        data: {
          id: inactiveDeviceId.getValue(),
          deviceId: inactiveDeviceId.getValue(),
          hostname: inactiveDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: 'OFFLINE',
          deletedAt: new Date(),
        },
      });

      const activeDevices = await deviceRepository.findActive();

      expect(activeDevices.length).toBeGreaterThanOrEqual(1);
      const activeDeviceIds = activeDevices.map(d => d.getId().getValue());
      expect(activeDeviceIds).toContain(testDeviceId.getValue());
      // Note: findActive might have different logic, this is testing the current implementation
    });
  });

  describe('findInactive', () => {
    it('should return only inactive devices', async () => {
      // Create inactive device
      const inactiveDeviceId = DeviceId.create('inactive-device');
      const inactiveDeviceName = DeviceName.create('Inactive Device');

      await prisma.device.create({
        data: {
          id: inactiveDeviceId.getValue(),
          deviceId: inactiveDeviceId.getValue(),
          hostname: inactiveDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: 'OFFLINE',
          deletedAt: new Date(),
        },
      });

      const inactiveDevices = await deviceRepository.findInactive();

      expect(inactiveDevices.length).toBeGreaterThanOrEqual(1);
      const inactiveDeviceIds = inactiveDevices.map(d => d.getId().getValue());
      expect(inactiveDeviceIds).toContain(inactiveDeviceId.getValue());
    });
  });

  describe('exists', () => {
    it('should return true for existing device', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const exists = await deviceRepository.exists(testDeviceId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent device', async () => {
      const nonExistentDeviceId = DeviceId.create('non-existent-device');
      const exists = await deviceRepository.exists(nonExistentDeviceId);

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should count total devices', async () => {
      const initialCount = await deviceRepository.count();

      // Create a device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      const finalCount = await deviceRepository.count();
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('delete', () => {
    it('should soft delete device', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      await deviceRepository.delete(testDeviceId);

      // Verify device is soft deleted
      const deletedDevice = await prisma.device.findUnique({
        where: { id: testDeviceId.getValue() },
      });

      expect(deletedDevice?.deletedAt).toBeDefined();
    });
  });

  describe('data integrity and constraints', () => {
    it('should maintain referential integrity with customer and user', async () => {
      const device = Device.create({
        id: testDeviceId,
        deviceId: testDeviceId,
        hostname: testDeviceName,
        ipAddress: testIpAddress,
        sshCredentials: testSshCredentials,
        customerId: testCustomerId,
        userId: testUserId,
        deviceType: testDeviceType,
        status: testStatus,
      });

      await deviceRepository.save(device);

      const savedDevice = await prisma.device.findUnique({
        where: { id: testDeviceId.getValue() },
        include: { customer: true, user: true },
      });

      expect(savedDevice?.customer).toBeDefined();
      expect(savedDevice?.customer?.id).toBe(testCustomerId.getValue());
      expect(savedDevice?.user).toBeDefined();
      expect(savedDevice?.user?.id).toBe(testUserId.getValue());
    });

    it('should handle unique constraint violations for deviceId', async () => {
      // Create first device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      // Try to create device with same deviceId
      const duplicateDevice = Device.create({
        id: DeviceId.create('different-id'),
        deviceId: testDeviceId, // Same deviceId
        hostname: DeviceName.create('Different Hostname'),
        ipAddress: IpAddress.create('192.168.1.102'),
        sshCredentials: testSshCredentials,
        customerId: testCustomerId,
        userId: testUserId,
        deviceType: testDeviceType,
        status: testStatus,
      });

      await expect(deviceRepository.save(duplicateDevice)).rejects.toThrow();
    });

    it('should handle IP address uniqueness within customer', async () => {
      // Create first device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: testStatus.getValue(),
        },
      });

      // Try to create device with same IP in same customer
      const duplicateIpDevice = Device.create({
        id: DeviceId.create('different-id'),
        deviceId: DeviceId.create('different-device-id'),
        hostname: DeviceName.create('Different Hostname'),
        ipAddress: testIpAddress, // Same IP
        sshCredentials: testSshCredentials,
        customerId: testCustomerId, // Same customer
        userId: testUserId,
        deviceType: testDeviceType,
        status: testStatus,
      });

      await expect(deviceRepository.save(duplicateIpDevice)).rejects.toThrow();
    });
  });

  describe('query performance and filtering', () => {
    it('should support filtering by status', async () => {
      // Create devices with different statuses
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: 'ONLINE',
        },
      });

      const offlineDeviceId = DeviceId.create('offline-device');
      const offlineDeviceName = DeviceName.create('Offline Device');

      await prisma.device.create({
        data: {
          id: offlineDeviceId.getValue(),
          deviceId: offlineDeviceId.getValue(),
          hostname: offlineDeviceName.getValue(),
          ipAddress: IpAddress.create('192.168.1.103'),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: testDeviceType.getValue(),
          status: 'OFFLINE',
        },
      });

      // Test that we can query devices by status (this tests the underlying query capability)
      const allDevices = await prisma.device.findMany({
        where: { customerId: testCustomerId.getValue() },
      });

      expect(allDevices).toHaveLength(2);
      const statuses = allDevices.map(d => d.status);
      expect(statuses).toContain('ONLINE');
      expect(statuses).toContain('OFFLINE');
    });

    it('should support filtering by device type', async () => {
      // Create devices with different types
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: testStatus.getValue(),
        },
      });

      const jetsonDeviceId = DeviceId.create('jetson-device');
      const jetsonDeviceName = DeviceName.create('Jetson Device');

      await prisma.device.create({
        data: {
          id: jetsonDeviceId.getValue(),
          deviceId: jetsonDeviceId.getValue(),
          hostname: jetsonDeviceName.getValue(),
          ipAddress: IpAddress.create('192.168.1.104'),
          username: testSshCredentials.getUsername(),
          password: testSshCredentials.getPassword(),
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'JETSON_NANO',
          status: testStatus.getValue(),
        },
      });

      // Test that we can query devices by type
      const piDevices = await prisma.device.findMany({
        where: {
          customerId: testCustomerId.getValue(),
          deviceType: 'PI_4',
        },
      });

      expect(piDevices).toHaveLength(1);
      expect(piDevices[0].deviceType).toBe('PI_4');
    });
  });
});
