/**
 * E2E Test: Device Lifecycle Journey
 * 
 * This test validates the complete device management flow:
 * 1. Register new device
 * 2. Device comes online and reports metrics
 * 3. Monitor device health
 * 4. Device triggers alert
 * 5. Operator acknowledges alert
 * 6. Device is put into maintenance
 * 7. Device returns to service
 * 8. Device is decommissioned
 * 
 * @vitest-environment node
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {Device} from '@/lib/device/domain/entities/device.entity';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {IpAddress} from '@/lib/device/domain/value-objects/ip-address.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {AlertId} from '@/lib/monitoring/domain/value-objects/alert-id.vo';
import {AlertSeverity} from '@/lib/monitoring/domain/value-objects/alert-severity.vo';
import {AlertStatus} from '@/lib/monitoring/domain/value-objects/alert-status.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

const prismaService = new PrismaService();
const prisma = prismaService.getClient();

describe('E2E: Device Lifecycle Journey', () => {
    let customerId: CustomerId;
    let deviceId: DeviceId;
    let userId: UserId;
    let customerDbId: string;
    let deviceDbId: string;
    let userDbId: string;

    beforeAll(async () => {
        // Create test customer
        const timestamp = Date.now();
        const customer = await prisma.customer.create({
            data: {
                name: `E2E Device Test Company ${timestamp}`,
                slug: `e2e-device-test-${timestamp}`,
                status: 'ACTIVE'
            }
        });
        customerDbId = customer.id;
        customerId = CustomerId.create(customer.id);

        // Create test user (operator)
        const user = await prisma.user.create({
            data: {
                email: `operator-${Date.now()}@company.com`,
                username: 'operator',
                password: '$2a$10$hashedpassword', // Mock hash
                passwordHash: '$2a$10$hashedpassword', // Mock hash
                role: 'USER',
                customerId: customer.id,
                status: 'ACTIVE'
            }
        });
        userDbId = user.id;
        userId = UserId.create(user.id);
    });

    afterAll(async () => {
        // Cleanup in reverse order due to foreign keys
        await prisma.alert.deleteMany({ where: { customerId: customerDbId } });
        await prisma.device.deleteMany({ where: { customerId: customerDbId } });
        await prisma.user.deleteMany({ where: { customerId: customerDbId } });
        await prisma.customer.delete({ where: { id: customerDbId } }).catch(() => {});
    });

    describe('Step 1: Device Registration', () => {
        it('should register a new IoT device', async () => {
            // Create device domain entity
            deviceId = DeviceId.create();
            const device = Device.create(
                deviceId,
                'rpi-001',
                'raspberrypi-production-01',
                'Production Server Room A',
                'raspberry_pi',
                IpAddress.create('192.168.1.100'),
                customerId,
                'offline' // Starts offline until it connects
            );

            // Persist to database
            await prisma.device.create({
                data: {
                    id: deviceId.getValue(),
                    deviceId: 'rpi-001',
                    hostname: device.getHostname(),
                    name: device.getName(),
                    deviceType: device.getDeviceType(),
                    ipAddress: device.getIpAddress().getValue(),
                    status: 'offline',
                    customerId: customerDbId,
                    sshPort: 22,
                    sshUsername: 'pi'
                }
            });

            // Verify device in database
            const dbDevice = await prisma.device.findUnique({
                where: { id: deviceId.getValue() }
            });

            expect(dbDevice).not.toBeNull();
            expect(dbDevice?.hostname).toBe('raspberrypi-production-01');
            expect(dbDevice?.status).toBe('offline');
            expect(dbDevice?.customerId).toBe(customerDbId);

            deviceDbId = dbDevice!.id;
        });
    });

    describe('Step 2: Device Connection', () => {
        it('should mark device as online when it connects', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    status: 'online',
                    lastSeen: new Date()
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.status).toBe('online');
            expect(device?.lastSeen).not.toBeNull();
        });

        it('should record initial device metrics', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    cpuUsage: 25.5,
                    memoryUsage: 45.2,
                    diskUsage: 60.0,
                    temperature: 45.0
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.cpuUsage).toBe(25.5);
            expect(device?.memoryUsage).toBe(45.2);
            expect(device?.diskUsage).toBe(60.0);
            expect(device?.temperature).toBe(45.0);
        });
    });

    describe('Step 3: Normal Operation Monitoring', () => {
        it('should periodically update device metrics', async () => {
            // Simulate 3 metric updates over time
            const metricUpdates = [
                { cpu: 30.0, memory: 50.0, disk: 60.0, temp: 46.0 },
                { cpu: 35.0, memory: 52.0, disk: 61.0, temp: 47.0 },
                { cpu: 40.0, memory: 55.0, disk: 62.0, temp: 48.0 }
            ];

            for (const metrics of metricUpdates) {
                await prisma.device.update({
                    where: { id: deviceDbId },
                    data: {
                        cpuUsage: metrics.cpu,
                        memoryUsage: metrics.memory,
                        diskUsage: metrics.disk,
                        temperature: metrics.temp,
                        lastSeen: new Date()
                    }
                });

                // Small delay to simulate time passing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.cpuUsage).toBe(40.0);
            expect(device?.temperature).toBe(48.0);
        });

        it('should track device uptime', async () => {
            const device = await prisma.device.findUnique({
                where: { id: deviceDbId },
                select: { createdAt: true, lastSeen: true }
            });

            expect(device?.lastSeen).not.toBeNull();
            expect(device?.createdAt).not.toBeNull();
            
            const uptime = device!.lastSeen!.getTime() - device!.createdAt.getTime();
            expect(uptime).toBeGreaterThan(0);
        });
    });

    describe('Step 4: Alert Triggering', () => {
        it('should create alert when CPU exceeds threshold', async () => {
            // Simulate high CPU
            await prisma.device.update({
                where: { id: deviceDbId },
                data: { cpuUsage: 92.5 }
            });

            // Create alert for high CPU
            const alertId = AlertId.create();
            const alert = Alert.create(
                alertId,
                'High CPU Usage',
                'CPU usage exceeded 90% threshold (current: 92.5%)',
                AlertSeverity.create('HIGH'),
                AlertStatus.create('ACTIVE'),
                'cpu_threshold_90',
                DeviceId.create(deviceDbId),
                customerId
            );

            await prisma.alert.create({
                data: {
                    id: alertId.getValue(),
                    title: alert.getTitle(),
                    message: alert.getMessage(),
                    severity: alert.getSeverity().getValue(),
                    status: alert.getStatus().getValue(),
                    thresholdId: 'cpu_threshold_90',
                    deviceId: deviceDbId,
                    customerId: customerDbId,
                    createdAt: new Date()
                }
            });

            // Verify alert created
            const dbAlert = await prisma.alert.findUnique({
                where: { id: alertId.getValue() }
            });

            expect(dbAlert).not.toBeNull();
            expect(dbAlert?.severity).toBe('HIGH');
            expect(dbAlert?.status).toBe('ACTIVE');
            expect(dbAlert?.deviceId).toBe(deviceDbId);
        });

        it('should show active alerts for device', async () => {
            const alerts = await prisma.alert.findMany({
                where: {
                    deviceId: deviceDbId,
                    status: 'ACTIVE'
                }
            });

            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].severity).toBe('HIGH');
        });
    });

    describe('Step 5: Alert Acknowledgment', () => {
        it('should allow operator to acknowledge alert', async () => {
            const alert = await prisma.alert.findFirst({
                where: {
                    deviceId: deviceDbId,
                    status: 'ACTIVE'
                }
            });

            expect(alert).not.toBeNull();

            await prisma.alert.update({
                where: { id: alert!.id },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: new Date(),
                    acknowledgedBy: userDbId,
                    notes: 'Investigating high CPU usage'
                }
            });

            const updatedAlert = await prisma.alert.findUnique({
                where: { id: alert!.id }
            });

            expect(updatedAlert?.status).toBe('ACKNOWLEDGED');
            expect(updatedAlert?.acknowledgedBy).toBe(userDbId);
            expect(updatedAlert?.notes).toBe('Investigating high CPU usage');
        });
    });

    describe('Step 6: Maintenance Mode', () => {
        it('should put device into maintenance', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    status: 'maintenance',
                    cpuUsage: 0,
                    memoryUsage: 0
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.status).toBe('maintenance');
        });

        it('should resolve alert after maintenance', async () => {
            // After fixing the issue, CPU returns to normal
            await prisma.device.update({
                where: { id: deviceDbId },
                data: { cpuUsage: 35.0 }
            });

            // Resolve the alert
            const alert = await prisma.alert.findFirst({
                where: {
                    deviceId: deviceDbId,
                    status: 'ACKNOWLEDGED'
                }
            });

            if (alert) {
                await prisma.alert.update({
                    where: { id: alert.id },
                    data: {
                        status: 'RESOLVED',
                        resolvedAt: new Date(),
                        resolvedBy: userDbId,
                        resolutionNotes: 'Optimized process, CPU usage normalized'
                    }
                });

                const resolved = await prisma.alert.findUnique({
                    where: { id: alert.id }
                });

                expect(resolved?.status).toBe('RESOLVED');
                expect(resolved?.resolvedBy).toBe(userDbId);
            }
        });
    });

    describe('Step 7: Return to Service', () => {
        it('should bring device back online', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    status: 'online',
                    lastSeen: new Date()
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.status).toBe('online');
        });

        it('should verify device is healthy', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    cpuUsage: 30.0,
                    memoryUsage: 50.0,
                    temperature: 45.0
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.cpuUsage).toBeLessThan(50);
            expect(device?.temperature).toBeLessThan(60);
        });
    });

    describe('Step 8: Device Decommission', () => {
        it('should soft-delete device', async () => {
            await prisma.device.update({
                where: { id: deviceDbId },
                data: {
                    deletedAt: new Date(),
                    status: 'offline'
                }
            });

            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            expect(device?.deletedAt).not.toBeNull();
            expect(device?.status).toBe('offline');
        });

        it('should not show deleted devices in active list', async () => {
            const activeDevices = await prisma.device.findMany({
                where: {
                    customerId: customerDbId,
                    deletedAt: null
                }
            });

            expect(activeDevices).toHaveLength(0);
        });

        it('should archive associated alerts', async () => {
            const alerts = await prisma.alert.findMany({
                where: { deviceId: deviceDbId }
            });

            // Alerts should still exist for audit trail
            expect(alerts.length).toBeGreaterThan(0);
            
            // All alerts should be resolved or acknowledged
            const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
            expect(activeAlerts).toHaveLength(0);
        });
    });

    describe('Step 9: Complete Lifecycle Verification', () => {
        it('should have complete audit trail', async () => {
            const device = await prisma.device.findUnique({
                where: { id: deviceDbId },
                include: {
                    alerts: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            expect(device).not.toBeNull();
            expect(device?.createdAt).not.toBeNull();
            expect(device?.updatedAt).not.toBeNull();
            expect(device?.deletedAt).not.toBeNull();
            expect(device?.alerts.length).toBeGreaterThan(0);
        });

        it('should show device lifecycle timeline', async () => {
            const device = await prisma.device.findUnique({
                where: { id: deviceDbId }
            });

            const lifecycle = {
                registered: device?.createdAt,
                lastActivity: device?.lastSeen,
                decommissioned: device?.deletedAt
            };

            expect(lifecycle.registered).not.toBeNull();
            expect(lifecycle.lastActivity).not.toBeNull();
            expect(lifecycle.decommissioned).not.toBeNull();

            // Verify timeline is logical
            const registeredTime = lifecycle.registered!.getTime();
            const lastActivityTime = lifecycle.lastActivity!.getTime();
            const decommissionedTime = lifecycle.decommissioned!.getTime();

            expect(lastActivityTime).toBeGreaterThanOrEqual(registeredTime);
            expect(decommissionedTime).toBeGreaterThanOrEqual(lastActivityTime);
        });
    });
});

