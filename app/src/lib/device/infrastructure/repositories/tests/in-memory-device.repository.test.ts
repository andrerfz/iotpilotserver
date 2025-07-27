import {InMemoryDeviceRepository} from '../in-memory-device.repository';
import {Device} from '../../../domain/entities/device.entity';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

describe('InMemoryDeviceRepository', () => {
    let repository: InMemoryDeviceRepository;
    let tenantContext1: TenantContext;
    let tenantContext2: TenantContext;
    let superAdminContext: TenantContext;
    let device1: Device;
    let device2: Device;

    beforeEach(() => {
        repository = new InMemoryDeviceRepository();

        // Create tenant contexts
        tenantContext1 = TenantContext.create(CustomerId.create('tenant-1'));
        tenantContext2 = TenantContext.create(CustomerId.create('tenant-2'));
        superAdminContext = TenantContext.superAdmin();

        // Create test devices
        device1 = Device.create(
            DeviceId.create('device-1'),
            DeviceName.create('device-1'),
            IpAddress.create('192.168.1.100'),
            SshCredentials.create('pi', 'password'),
            CustomerId.create('tenant-1')
        );

        device2 = Device.create(
            DeviceId.create('device-2'),
            DeviceName.create('device-2'),
            IpAddress.create('192.168.1.101'),
            SshCredentials.create('pi', 'password'),
            CustomerId.create('tenant-2')
        );

        // Save devices
        repository.save(device1);
        repository.save(device2);
    });

    describe('findById', () => {
        it('should return device when found and belongs to tenant', async () => {
            const result = await repository.findById(DeviceId.create('device-1'), tenantContext1);

            expect(result).toBe(device1);
        });

        it('should return null when device not found', async () => {
            const result = await repository.findById(DeviceId.create('non-existent'), tenantContext1);

            expect(result).toBeNull();
        });

        it('should return null when device belongs to different tenant', async () => {
            const result = await repository.findById(DeviceId.create('device-1'), tenantContext2);

            expect(result).toBeNull();
        });

        it('should return device when super admin bypasses tenant restrictions', async () => {
            const result = await repository.findById(DeviceId.create('device-1'), superAdminContext);

            expect(result).toBe(device1);
        });

        it('should return device when no tenant context provided', async () => {
            const result = await repository.findById(DeviceId.create('device-1'));

            expect(result).toBe(device1);
        });
    });

    describe('findByName', () => {
        it('should return device when found by name and belongs to tenant', async () => {
            const result = await repository.findByName('device-1', tenantContext1);

            expect(result).toBe(device1);
        });

        it('should return null when device not found by name', async () => {
            const result = await repository.findByName('non-existent', tenantContext1);

            expect(result).toBeNull();
        });

        it('should return null when device with name belongs to different tenant', async () => {
            const result = await repository.findByName('device-1', tenantContext2);

            expect(result).toBeNull();
        });

        it('should return device when super admin bypasses tenant restrictions', async () => {
            const result = await repository.findByName('device-1', superAdminContext);

            expect(result).toBe(device1);
        });
    });

    describe('findByIpAddress', () => {
        it('should return device when found by IP and belongs to tenant', async () => {
            const result = await repository.findByIpAddress('192.168.1.100', tenantContext1);

            expect(result).toBe(device1);
        });

        it('should return null when device not found by IP', async () => {
            const result = await repository.findByIpAddress('192.168.1.999', tenantContext1);

            expect(result).toBeNull();
        });

        it('should return null when device with IP belongs to different tenant', async () => {
            const result = await repository.findByIpAddress('192.168.1.100', tenantContext2);

            expect(result).toBeNull();
        });

        it('should return device when super admin bypasses tenant restrictions', async () => {
            const result = await repository.findByIpAddress('192.168.1.100', superAdminContext);

            expect(result).toBe(device1);
        });
    });

    describe('findAll', () => {
        it('should return all devices for tenant', async () => {
            const result = await repository.findAll(tenantContext1);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(device1);
        });

        it('should return all devices for super admin', async () => {
            const result = await repository.findAll(superAdminContext);

            expect(result).toHaveLength(2);
            expect(result).toContain(device1);
            expect(result).toContain(device2);
        });

        it('should filter devices by tenant', async () => {
            const result1 = await repository.findAll(tenantContext1);
            const result2 = await repository.findAll(tenantContext2);

            expect(result1).toHaveLength(1);
            expect(result1[0]).toBe(device1);
            expect(result2).toHaveLength(1);
            expect(result2[0]).toBe(device2);
        });
    });

    describe('findActive', () => {
        it('should return only active devices for tenant', async () => {
            // Make device1 inactive
            const inactiveDevice = Device.create(
                DeviceId.create('device-3'),
                DeviceName.create('device-3'),
                IpAddress.create('192.168.1.102'),
                SshCredentials.create('pi', 'password'),
                CustomerId.create('tenant-1')
            );
            await repository.save(inactiveDevice);

            const result = await repository.findActive(tenantContext1);

            expect(result).toHaveLength(1); // Only device1 should be active
            expect(result[0]).toBe(device1);
        });
    });

    describe('findInactive', () => {
        it('should return only inactive devices for tenant', async () => {
            // Make device1 inactive
            const inactiveDevice = Device.create(
                DeviceId.create('device-3'),
                DeviceName.create('device-3'),
                IpAddress.create('192.168.1.102'),
                SshCredentials.create('pi', 'password'),
                CustomerId.create('tenant-1')
            );
            await repository.save(inactiveDevice);

            const result = await repository.findInactive(tenantContext1);

            expect(result).toHaveLength(1);
            expect(result[0].id).toEqual(DeviceId.create('device-3'));
        });
    });

    describe('save', () => {
        it('should save device successfully', async () => {
            const newDevice = Device.create(
                DeviceId.create('device-3'),
                DeviceName.create('device-3'),
                IpAddress.create('192.168.1.102'),
                SshCredentials.create('pi', 'password'),
                CustomerId.create('tenant-1')
            );

            await repository.save(newDevice);

            const result = await repository.findById(DeviceId.create('device-3'), tenantContext1);
            expect(result).toBe(newDevice);
        });

        it('should update existing device', async () => {
            // Create a modified version of device1
            const updatedDevice = Device.create(
                DeviceId.create('device-1'),
                DeviceName.create('updated-device-1'),
                IpAddress.create('192.168.1.100'),
                SshCredentials.create('pi', 'password'),
                CustomerId.create('tenant-1')
            );

            await repository.save(updatedDevice);

            const result = await repository.findById(DeviceId.create('device-1'), tenantContext1);
            expect(result).toBe(updatedDevice);
            expect(result?.name.getValue()).toBe('updated-device-1');
        });
    });

    describe('delete', () => {
        it('should delete device successfully', async () => {
            await repository.delete(DeviceId.create('device-1'));

            const result = await repository.findById(DeviceId.create('device-1'), tenantContext1);
            expect(result).toBeNull();
        });

        it('should not throw error when deleting non-existent device', async () => {
            await expect(repository.delete(DeviceId.create('non-existent'))).resolves.not.toThrow();
        });
    });

    describe('exists', () => {
        it('should return true when device exists and belongs to tenant', async () => {
            const result = await repository.exists(DeviceId.create('device-1'), tenantContext1);

            expect(result).toBe(true);
        });

        it('should return false when device does not exist', async () => {
            const result = await repository.exists(DeviceId.create('non-existent'), tenantContext1);

            expect(result).toBe(false);
        });

        it('should return false when device exists but belongs to different tenant', async () => {
            const result = await repository.exists(DeviceId.create('device-1'), tenantContext2);

            expect(result).toBe(false);
        });

        it('should return true when super admin checks device from any tenant', async () => {
            const result = await repository.exists(DeviceId.create('device-1'), superAdminContext);

            expect(result).toBe(true);
        });
    });

    describe('count', () => {
        it('should return correct count for tenant', async () => {
            const count = await repository.count(tenantContext1);

            expect(count).toBe(1);
        });

        it('should return total count for super admin', async () => {
            const count = await repository.count(superAdminContext);

            expect(count).toBe(2);
        });
    });
});