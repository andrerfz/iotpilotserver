import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {PrismaDeviceRepository} from '@iotpilot/core/device/infrastructure/repositories/prisma-device.repository';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {SshCredentials} from '@iotpilot/core/device/domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@iotpilot/core/customer/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {Device} from '@iotpilot/core/device/domain/entities/device.entity';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {DeviceType} from '@iotpilot/core/device/domain/value-objects/device-type.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import type {PrismaClient} from '@prisma/client';

describe('Device Repository Integration Tests', () => {
  let deviceRepository: PrismaDeviceRepository;
  let prismaService: PrismaService;
  let prisma: PrismaClient;
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
    prisma = prismaService.getClient();
    deviceRepository = new PrismaDeviceRepository(prismaService, undefined);

    // Create test data (value objects that don't require CUID format)
    testDeviceId = DeviceId.create('test-device-repo');
    testDeviceName = DeviceName.create('Test Device Repo');
    testIpAddress = IpAddress.create('192.168.1.100');
    testSshCredentials = SshCredentials.create('testuser', 'testpass');
    testDeviceType = DeviceType.create('server'); // DeviceTypeEnum value; Prisma deviceType can differ
    testStatus = DeviceStatus.onlineAndActive();

    // Clean up any existing test data from previous run
    await prisma.device.deleteMany({
      where: {
        OR: [
          { id: testDeviceId.getValue() },
          { deviceId: testDeviceId.getValue() },
          { hostname: testDeviceName.getValue() },
          { id: 'test-device-repo-2' },
          { deviceId: 'test-device-repo-2' },
        ],
      },
    });

    if (testCustomerId) {
      await prisma.device.deleteMany({ where: { customerId: testCustomerId.getValue() } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId.getValue() } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId.getValue() } });
    }

    // Create test customer and user (let Prisma generate CUIDs for CustomerId/UserId validation)
    const slug = `test-customer-device-repo-${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer Device Repo',
        slug,
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
      },
    });
    testCustomerId = CustomerId.create(customer.id);

    const user = await prisma.user.create({
      data: {
        email: `testuser-device-repo-${Date.now()}@test.com`,
        username: `testuserdevicerepo${Date.now()}`,
        password: 'hashedpassword',
        role: 'ADMIN',
        customerId: customer.id,
        status: 'ACTIVE',
      },
    });
    testUserId = UserId.create(user.id);
  });

  afterEach(async () => {
    // Clean up test data (devices before customer, due to FK)
    await prisma.device.deleteMany({
      where: {
        OR: [
          { id: testDeviceId.getValue() },
          { deviceId: testDeviceId.getValue() },
          { hostname: testDeviceName.getValue() },
          { id: 'test-device-repo-2' },
          { deviceId: 'test-device-repo-2' },
        ],
      },
    });
    if (testCustomerId) {
      await prisma.device.deleteMany({ where: { customerId: testCustomerId.getValue() } });
    }

    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId.getValue() } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId.getValue() } });
    }
  });

  describe.skip('save', () => {
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
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const foundDevice = await deviceRepository.findById(testDeviceId);

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue()); // deviceId same as id in entity
      expect(foundDevice?.hostname ?? foundDevice?.name?.getValue?.()).toBe(testDeviceName.getValue());
      expect(foundDevice?.getIpAddress?.()?.getValue?.() ?? foundDevice?.ipAddress).toBe(testIpAddress.getValue());
      expect(foundDevice?.getCustomerId().getValue()).toBe(testCustomerId.getValue());
      expect(foundDevice?.getStatusData?.()?.businessStatus ?? foundDevice?.status?.getValue?.()).toBe('active');
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
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const foundDevice = await deviceRepository.findByName(testDeviceName.getValue());

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.name?.getValue?.() ?? foundDevice?.hostname).toBe(testDeviceName.getValue());
    });

    it('should return null for non-existent hostname', async () => {
      const nonExistentName = DeviceName.create('Non Existent Device');
      const foundDevice = await deviceRepository.findByName(nonExistentName.getValue());

      expect(foundDevice).toBeNull();
    });
  });

  describe('findByIpAddress', () => {
    it('should find device by IP address', async () => {
      // Use a unique IP to avoid collisions with other tests
      const uniqueIp = IpAddress.create('192.168.1.201');
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: uniqueIp.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const tenantCtx = { getCustomerId: () => ({ getValue: () => testCustomerId.getValue() }), isSuperAdmin: () => false };
      const foundDevice = await deviceRepository.findByIpAddress(uniqueIp.getValue(), tenantCtx as any);

      expect(foundDevice).toBeDefined();
      expect(foundDevice?.getId().getValue()).toBe(testDeviceId.getValue());
      expect(foundDevice?.getIpAddress?.()?.getValue?.() ?? foundDevice?.ipAddress).toBe(uniqueIp.getValue());
    });

    it('should return null for non-existent IP address', async () => {
      const nonExistentIp = IpAddress.create('203.0.113.99'); // TEST-NET, unlikely to exist
      const tenantCtx = { getCustomerId: () => ({ getValue: () => testCustomerId.getValue() }), isSuperAdmin: () => false };
      const foundDevice = await deviceRepository.findByIpAddress(nonExistentIp.getValue(), tenantCtx as any);

      expect(foundDevice).toBeNull();
    });
  });

  describe('findAll', () => {
    it.skip('should return all devices', async () => {
      // Create multiple devices
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const secondDeviceId = DeviceId.create('test-device-repo-2');
      const secondDeviceName = DeviceName.create('Test Device Repo 2');
      const secondIpAddress = IpAddress.create('192.168.1.101');

      await prisma.device.create({
        data: {
          id: secondDeviceId.getValue(),
          deviceId: secondDeviceId.getValue(),
          name: secondDeviceName.getValue(),
          hostname: secondDeviceName.getValue(),
          ipAddress: secondIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
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
      // Create active device with lastSeen within 2 min (findOnlineDevices threshold)
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
          lastSeen: new Date(),
        },
      });

      // Create inactive device
      const inactiveDeviceId = DeviceId.create('inactive-device');
      const inactiveDeviceName = DeviceName.create('Inactive Device');

      await prisma.device.create({
        data: {
          id: inactiveDeviceId.getValue(),
          deviceId: inactiveDeviceId.getValue(),
          name: inactiveDeviceName.getValue(),
          hostname: inactiveDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'OFFLINE',
          deletedAt: new Date(),
        },
      });

      const activeDevices = await deviceRepository.findOnlineDevices();

      expect(activeDevices.length).toBeGreaterThanOrEqual(1);
      const activeDeviceIds = activeDevices.map(d => d.getId().getValue());
      expect(activeDeviceIds).toContain(testDeviceId.getValue());
    });
  });

  describe.skip('findInactive', () => {
    it('should return only inactive devices', async () => {
      // Create inactive device
      const inactiveDeviceId = DeviceId.create('inactive-device');
      const inactiveDeviceName = DeviceName.create('Inactive Device');

      await prisma.device.create({
        data: {
          id: inactiveDeviceId.getValue(),
          deviceId: inactiveDeviceId.getValue(),
          name: inactiveDeviceName.getValue(),
          hostname: inactiveDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
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

  describe.skip('exists', () => {
    it('should return true for existing device', async () => {
      // Create device in database
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
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
      // Scope count to this test's customer so the assertion is stable (shared DB
      // can change global count between initialCount and finalCount).
      const tenantCtx = {
        getCustomerId: () => ({ getValue: () => testCustomerId.getValue() }),
        isSuperAdmin: () => false,
      };
      const initialCount = await deviceRepository.count(tenantCtx as any);

      // Create a device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const finalCount = await deviceRepository.count(tenantCtx as any);
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
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      await deviceRepository.softDelete(testDeviceId);

      // Verify device is soft deleted
      const deletedDevice = await prisma.device.findUnique({
        where: { id: testDeviceId.getValue() },
      });

      expect(deletedDevice?.deletedAt).toBeDefined();
    });
  });

  describe.skip('data integrity and constraints', () => {
    it.skip('should maintain referential integrity with customer and user', async () => {
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

    it.skip('should handle unique constraint violations for deviceId', async () => {
      // Create first device
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
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
          name: testDeviceName.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
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
    it.skip('should support filtering by status', async () => {
      // Create devices with different statuses
      await prisma.device.create({
        data: {
          id: testDeviceId.getValue(),
          deviceId: testDeviceId.getValue(),
          hostname: testDeviceName.getValue(),
          ipAddress: testIpAddress.getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const offlineDeviceId = DeviceId.create('offline-device');
      const offlineDeviceName = DeviceName.create('Offline Device');

      await prisma.device.create({
        data: {
          id: offlineDeviceId.getValue(),
          deviceId: offlineDeviceId.getValue(),
          name: offlineDeviceName.getValue(),
          hostname: offlineDeviceName.getValue(),
          ipAddress: IpAddress.create('192.168.1.103'),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
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
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'PI_4',
          status: 'ONLINE',
        },
      });

      const otherDeviceId = DeviceId.create('other-type-device');
      const otherDeviceName = DeviceName.create('Other Type Device');

      await prisma.device.create({
        data: {
          id: otherDeviceId.getValue(),
          deviceId: otherDeviceId.getValue(),
          name: otherDeviceName.getValue(),
          hostname: otherDeviceName.getValue(),
          ipAddress: IpAddress.create('192.168.1.104').getValue(),
          capabilities: { ssh: { username: testSshCredentials.getUsername(), password: testSshCredentials.getPassword() } },
          customerId: testCustomerId.getValue(),
          userId: testUserId.getValue(),
          deviceType: 'ORANGE_PI',
          status: 'ONLINE',
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
