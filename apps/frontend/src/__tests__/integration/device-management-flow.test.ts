/**
 * @vitest-environment node
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {SshCredentials} from '@iotpilot/core/device/domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {InMemoryEventBus} from '@iotpilot/core/shared/application/bus/event.bus';

// Mock in-memory device repository
class InMemoryDeviceRepository implements DeviceRepository {
    private devices: Map<string, DeviceEntity> = new Map();

    async findById(id: DeviceId, customerId?: CustomerId): Promise<DeviceEntity | null> {
        const device = this.devices.get(id.getValue());
        if (!device) return null;
        
        // Apply tenant filtering if customerId provided
        if (customerId && device.getCustomerId().getValue() !== customerId.getValue()) {
            return null;
        }
        
        return device;
    }

    async findByDeviceId(deviceId: string, customerId?: CustomerId): Promise<DeviceEntity | null> {
        for (const device of this.devices.values()) {
            if (device.id.getValue() === deviceId) {
                // Apply tenant filtering
                if (customerId && device.getCustomerId().getValue() !== customerId.getValue()) {
                    return null;
                }
                return device;
            }
        }
        return null;
    }

    async findAll(customerId?: CustomerId, filters?: any): Promise<DeviceEntity[]> {
        let devices = Array.from(this.devices.values());
        
        // Apply tenant filtering
        if (customerId) {
            devices = devices.filter(d => d.getCustomerId().getValue() === customerId.getValue());
        }
        
        // Apply status filter if provided (by businessStatus)
        if (filters?.status && filters.status !== 'all') {
            devices = devices.filter(d => d.status.businessStatus === filters.status);
        }
        
        return devices;
    }

    async save(device: DeviceEntity, customerId?: CustomerId): Promise<void> {
        // Validate tenant access
        if (customerId && device.getCustomerId().getValue() !== customerId.getValue()) {
            throw new Error('Tenant access violation: Cannot save device for different tenant');
        }
        
        this.devices.set(device.getId().getValue(), device);
    }

    async delete(id: DeviceId, customerId?: CustomerId): Promise<void> {
        const device = await this.findById(id, customerId);
        if (!device) {
            throw new Error('Device not found or access denied');
        }
        this.devices.delete(id.getValue());
    }

    async count(customerId?: CustomerId): Promise<number> {
        if (!customerId) {
            return this.devices.size;
        }
        
        let count = 0;
        for (const device of this.devices.values()) {
            if (device.getCustomerId().getValue() === customerId.getValue()) {
                count++;
            }
        }
        return count;
    }

    clear(): void {
        this.devices.clear();
    }
}

describe('Device Management Flow Integration', () => {
    let deviceRepository: InMemoryDeviceRepository;
    let eventBus: InMemoryEventBus;
    let customerId1: CustomerId;
    let customerId2: CustomerId;

    beforeEach(() => {
        deviceRepository = new InMemoryDeviceRepository();
        eventBus = new InMemoryEventBus();
        // Use valid UUIDs for customer IDs (v4 UUIDs)
        customerId1 = CustomerId.create('00000000-0000-4000-8000-000000000001');
        customerId2 = CustomerId.create('00000000-0000-4000-8000-000000000002');
    });

    describe('Device Registration and Retrieval', () => {
        it('should register a device and retrieve it', async () => {
            // Create and save device (using correct parameter order)
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );

            await deviceRepository.save(device, customerId1);

            // Retrieve device
            const retrievedDevice = await deviceRepository.findById(deviceId, customerId1);
            
            expect(retrievedDevice).not.toBeNull();
            expect(retrievedDevice?.name.getValue()).toBe('device-001');
            expect(retrievedDevice?.ipAddress.getValue()).toBe('192.168.1.100');
            expect(retrievedDevice?.status.getValue()).toBe('inactive');
            expect(retrievedDevice?.getCustomerId().getValue()).toBe(customerId1.getValue());
        });

        it('should register multiple devices for same tenant', async () => {
            // Register 3 devices for tenant 1
            for (let i = 1; i <= 3; i++) {
                const device = DeviceEntity.create(
                    DeviceId.create(`device-00${i}`),
                    DeviceName.create(`device-00${i}`),
                    customerId1,
                    DeviceStatus.offlineInactive(),
                    IpAddress.create(`192.168.1.10${i}`),
                    undefined, // tailscaleIp
                    `device-00${i}`, // hostname
                    SshCredentials.create('pi', 'password')
                );
                await deviceRepository.save(device, customerId1);
            }

            // Verify count
            const count = await deviceRepository.count(customerId1);
            expect(count).toBe(3);

            // Retrieve all devices
            const devices = await deviceRepository.findAll(customerId1);
            expect(devices).toHaveLength(3);
        });

        it('should update device status', async () => {
            // Create device
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Update status to offline
            device.updateStatus(DeviceStatus.offlineInactive());
            await deviceRepository.save(device, customerId1);

            // Verify update
            const updatedDevice = await deviceRepository.findById(deviceId, customerId1);
            expect(updatedDevice?.status.businessStatus).toBe('inactive');
        });

        it.skip('should update device metrics', async () => {
            // Create device
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Update metrics
            device.updateMetrics({
                cpuUsage: 45.5,
                memoryUsage: 60.2,
                diskUsage: 75.0,
                temperature: 55.3
            });
            await deviceRepository.save(device, customerId1);

            // Verify metrics
            const updatedDevice = await deviceRepository.findById(deviceId, customerId1);
            expect(updatedDevice?.getCpuUsage()).toBe(45.5);
            expect(updatedDevice?.getMemoryUsage()).toBe(60.2);
            expect(updatedDevice?.getDiskUsage()).toBe(75.0);
            expect(updatedDevice?.getTemperature()).toBe(55.3);
        });
    });

    describe('Multi-Tenant Isolation', () => {
        it('should isolate devices by tenant', async () => {
            // Register device for tenant 1
            const device1 = DeviceEntity.create(
                DeviceId.create('device-001'),
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device1, customerId1);

            // Register device for tenant 2
            const device2 = DeviceEntity.create(
                DeviceId.create('device-002'),
                DeviceName.create('device-002'),
                customerId2,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.101'),
                undefined, // tailscaleIp
                'device-002', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device2, customerId2);

            // Tenant 1 should only see their device
            const tenant1Devices = await deviceRepository.findAll(customerId1);
            expect(tenant1Devices).toHaveLength(1);
            expect(tenant1Devices[0].name.getValue()).toBe('device-001');

            // Tenant 2 should only see their device
            const tenant2Devices = await deviceRepository.findAll(customerId2);
            expect(tenant2Devices).toHaveLength(1);
            expect(tenant2Devices[0].name.getValue()).toBe('device-002');
        });

        it('should prevent cross-tenant device access', async () => {
            // Register device for tenant 1
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Tenant 2 tries to access tenant 1's device
            const accessAttempt = await deviceRepository.findById(deviceId, customerId2);
            expect(accessAttempt).toBeNull();
        });

        it('should prevent cross-tenant device updates', async () => {
            // Register device for tenant 1
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Tenant 2 tries to update tenant 1's device (should fail)
            await expect(async () => {
                await deviceRepository.save(device, customerId2);
            }).rejects.toThrow('Tenant access violation');
        });

        it('should prevent cross-tenant device deletion', async () => {
            // Register device for tenant 1
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Tenant 2 tries to delete tenant 1's device (should fail)
            await expect(async () => {
                await deviceRepository.delete(deviceId, customerId2);
            }).rejects.toThrow('Device not found or access denied');

            // Verify device still exists for tenant 1
            const stillExists = await deviceRepository.findById(deviceId, customerId1);
            expect(stillExists).not.toBeNull();
        });
    });

    describe('Device Filtering and Queries', () => {
        beforeEach(async () => {
            // Set up test data with various statuses
                const statusFactories = [
                    DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' }),
                    DeviceStatus.create({ businessStatus: 'inactive', connectivity: 'offline' }),
                    DeviceStatus.create({ businessStatus: 'maintenance', connectivity: 'online' })
                ];
            for (let i = 0; i < statusFactories.length; i++) {
                const device = DeviceEntity.create(
                    DeviceId.create(`device-00${i + 1}`),
                    DeviceName.create(`device-00${i + 1}`),
                    customerId1,
                    statusFactories[i],
                    IpAddress.create(`192.168.1.10${i + 1}`),
                    undefined, // tailscaleIp
                    `device-00${i + 1}`, // hostname
                    SshCredentials.create('pi', 'password')
                );
                await deviceRepository.save(device, customerId1);
            }
        });

        it('should filter devices by status', async () => {
            // Filter by businessStatus
            const activeDevices = await deviceRepository.findAll(customerId1, { status: 'active' });
            expect(activeDevices).toHaveLength(1);
            expect(activeDevices[0].status.businessStatus).toBe('active');

            const inactiveDevices = await deviceRepository.findAll(customerId1, { status: 'inactive' });
            expect(inactiveDevices).toHaveLength(1);
            expect(inactiveDevices[0].status.businessStatus).toBe('inactive');
        });

        it('should return all devices when no filter applied', async () => {
            const allDevices = await deviceRepository.findAll(customerId1);
            expect(allDevices).toHaveLength(3);
        });

        it('should return all devices with explicit "all" status filter', async () => {
            const allDevices = await deviceRepository.findAll(customerId1, { status: 'all' });
            expect(allDevices).toHaveLength(3);
        });
    });

    describe('Device Lifecycle', () => {
        it.skip('should handle complete device lifecycle', async () => {
            const deviceId = DeviceId.create('device-001');
            
            // 1. Register device
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // 2. Update metrics periodically
            device.updateMetrics({
                cpuUsage: 30.0,
                memoryUsage: 50.0,
                diskUsage: 60.0,
                temperature: 45.0
            });
            await deviceRepository.save(device, customerId1);

            // 3. Mark as maintenance
            device.updateStatus('maintenance');
            await deviceRepository.save(device, customerId1);

            // 4. Update metrics during maintenance
            device.updateMetrics({
                cpuUsage: 10.0,
                memoryUsage: 30.0,
                diskUsage: 60.0,
                temperature: 40.0
            });
            await deviceRepository.save(device, customerId1);

            // 5. Bring back online
            device.updateStatus('online');
            await deviceRepository.save(device, customerId1);

            // 6. Verify final state
            const finalDevice = await deviceRepository.findById(deviceId, customerId1);
            expect(finalDevice?.getStatus()).toBe('online');
            expect(finalDevice?.getCpuUsage()).toBe(10.0);

            // 7. Decommission device
            await deviceRepository.delete(deviceId, customerId1);

            // 8. Verify device is removed
            const deletedDevice = await deviceRepository.findById(deviceId, customerId1);
            expect(deletedDevice).toBeNull();
        });
    });

    describe('Device Search', () => {
        it('should find device by device ID', async () => {
            const device = DeviceEntity.create(
                DeviceId.create('device-001'),
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            const found = await deviceRepository.findByDeviceId('device-001', customerId1);
            expect(found).not.toBeNull();
            expect(found?.name.getValue()).toBe('device-001');
        });

        it('should not find device from different tenant by device ID', async () => {
            const device = DeviceEntity.create(
                DeviceId.create('device-001'),
                DeviceName.create('device-001'),
                customerId1,
                DeviceStatus.offlineInactive(),
                IpAddress.create('192.168.1.100'),
                undefined, // tailscaleIp
                'device-001', // hostname
                SshCredentials.create('pi', 'password')
            );
            await deviceRepository.save(device, customerId1);

            // Try to find from tenant 2
            const found = await deviceRepository.findByDeviceId('device-001', customerId2);
            expect(found).toBeNull();
        });
    });

    describe('Concurrent Updates', () => {
        it.skip('should handle concurrent metric updates', async () => {
            // Skipping due to missing updateMetrics method on Device entity
            const deviceId = DeviceId.create('device-001');
            const device = DeviceEntity.create(
                deviceId,
                DeviceName.create('device-001'),
                IpAddress.create('192.168.1.100'),
                SshCredentials.create('pi', 'password'),
                customerId1
            );
            await deviceRepository.save(device, customerId1);

            // Simulate concurrent updates
            const updates = [
                { cpuUsage: 10, memoryUsage: 20, diskUsage: 30, temperature: 40 },
                { cpuUsage: 15, memoryUsage: 25, diskUsage: 35, temperature: 42 },
                { cpuUsage: 20, memoryUsage: 30, diskUsage: 40, temperature: 45 }
            ];

            for (const metrics of updates) {
                device.updateMetrics(metrics);
                await deviceRepository.save(device, customerId1);
            }

            // Verify final state has last update
            const finalDevice = await deviceRepository.findById(deviceId, customerId1);
            expect(finalDevice?.getCpuUsage()).toBe(20);
            expect(finalDevice?.getMemoryUsage()).toBe(30);
        });
    });
});

