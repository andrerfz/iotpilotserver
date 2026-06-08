// app/src/__tests__/integration/api-routes-device.integration.test.ts
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {NextRequest} from 'next/server';
import {GET as devicesGET, POST as devicesPOST} from '@/app/api/devices/route';
import {DELETE as deviceDELETE, GET as deviceGET, PUT as devicePUT} from '@/app/api/devices/[id]/route';
import {POST as deviceSSH} from '@/app/api/devices/[id]/ssh/route';
import {GET as deviceMetrics} from '@/app/api/devices/[id]/metrics/route';
import {GET as deviceStatus} from '@/app/api/devices/[id]/status/route';
import {POST as deviceBulk} from '@/app/api/devices/bulk/route';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {hash} from 'bcryptjs';

// Declare Node.js globals for this test file
declare const process: {
  stdout: {
    write: (message: string) => boolean;
  };
};

describe('Device API Routes Integration Tests', () => {
    let prismaService: PrismaService;
    let testUserId: string;
    let testCustomerId: string;
    let testDeviceId: string;
    let authToken: string;
    let timestamp: number;

    beforeAll(async () => {
        prismaService = new PrismaService();
        timestamp = Date.now();
        // Create test customer (let Prisma generate CUID for CustomerId validation)
        const testCustomer = await prismaService.getClient().customer.create({
            data: {
                name: 'Test Customer Device API',
                slug: `test-customer-device-api-${timestamp}`,
                domain: `testdeviceapi-${timestamp}.com`,
                status: 'ACTIVE'
            }
        });
        testCustomerId = testCustomer.id;

        // Create test user (let Prisma generate CUID)
        const hashedPassword = await hash('testPassword123', 12);
        const testUser = await prismaService.getClient().user.create({
            data: {
                email: `deviceapi-${timestamp}@testdeviceapi.com`,
                username: `deviceapiuser-${timestamp}`,
                password: hashedPassword,
                role: 'ADMIN',
                customerId: testCustomerId
            }
        });
        testUserId = testUser.id;
    });

    beforeEach(async () => {
        // Force console output to appear
        process.stdout.write('🔍 BEFORE EACH TEST STARTING\n');
        
        try {
            // Test database connection first
            await prismaService.getClient().$connect();
            process.stdout.write('✅ Database connected\n');
            
            // Clean up devices and sessions before each test
            await prismaService.getClient().device.deleteMany({ where: { customerId: testCustomerId } });
            await prismaService.getClient().session.deleteMany({ where: { customerId: testCustomerId } });
            process.stdout.write('✅ Cleanup completed\n');
            
            // Create test session/token for each test
            authToken = `test_token_${timestamp}_${Date.now()}`;
            process.stdout.write(`🔍 Creating session with token: ${authToken}\n`);
            
            const sessionData = {
                id: `test_session_device_api_${timestamp}_${Date.now()}`,
                token: authToken,
                userId: testUserId,
                customerId: testCustomerId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            };
            
            process.stdout.write(`🔍 Session data: ${JSON.stringify(sessionData)}\n`);
            
            const session = await prismaService.getClient().session.create({
                data: sessionData
            });
            
            process.stdout.write(`✅ Session created successfully: ${session.id}\n`);
            
            // Verify session was created
            const verifySession = await prismaService.getClient().session.findFirst({
                where: { token: authToken }
            });
            process.stdout.write(`🔍 Session verification: found=${!!verifySession}, id=${verifySession?.id}\n`);
            
        } catch (error) {
            process.stdout.write(`❌ Error in beforeEach: ${error.message}\n`);
            process.stdout.write(`❌ Error stack: ${error.stack}\n`);
            throw error;
        }
    });

    afterAll(async () => {
        // Clean up test data - ensure testUserId is defined
        if (testCustomerId) {
            await prismaService.getClient().device.deleteMany({ where: { customerId: testCustomerId } });
            await prismaService.getClient().session.deleteMany({ where: { customerId: testCustomerId } });
        }
        if (testUserId) {
            await prismaService.getClient().user.delete({ where: { id: testUserId } }).catch(() => {});
        }
        if (testCustomerId) {
            await prismaService.getClient().customer.delete({ where: { id: testCustomerId } }).catch(() => {});
        }
    });

    describe('GET /api/devices', () => {
        it.skip('should list devices successfully', async () => {
            // Create a test device first
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_list',
                    deviceId: 'device_list_001',
                    hostname: 'Test Device List',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.100',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });

            // Verify session still exists before making the request
            const sessionBeforeRequest = await prismaService.getClient().session.findFirst({
                where: { token: authToken }
            });
            process.stdout.write(`🔍 Session before request: found=${!!sessionBeforeRequest}, id=${sessionBeforeRequest?.id}\n`);

            const request = new NextRequest('http://localhost:3000/api/devices', {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await devicesGET(request);
            const data = await response.json();
            
            process.stdout.write(`🔍 Response status: ${response.status}\n`);
            process.stdout.write(`🔍 Response data: ${JSON.stringify(data)}\n`);

            expect(response.status).toBe(200);
            expect(data.devices).toBeInstanceOf(Array);
            expect(data.devices).toHaveLength(1);
            expect(data.devices[0].deviceId).toBe('device_list_001');
        });

        it('should require authentication', async () => {
            const request = new NextRequest('http://localhost:3000/api/devices', {
                method: 'GET'
            });

            const response = await devicesGET(request);
            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/devices', () => {
        it.skip('should register a new device successfully', async () => {
            const deviceData = {
                device_id: 'device_register_001',
                hostname: 'test-device-register',
                device_type: 'raspberry-pi',
                device_model: 'Pi 4',
                architecture: 'arm64',
                location: 'Test Lab',
                ip_address: '192.168.1.101',
                tailscale_ip: '10.0.0.101',
                mac_address: 'aa:bb:cc:dd:ee:01'
            };

            const request = new NextRequest('http://localhost:3000/api/devices', {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(deviceData)
            });

            const response = await devicesPOST(request);
            const data = await response.json();

            if (response.status !== 200) {
                process.stdout.write(`❌ POST /api/devices failed with status ${response.status}\n`);
                process.stdout.write(`❌ Error data: ${JSON.stringify(data)}\n`);
            }

            expect(response.status).toBe(201);
            expect(data?.device?.deviceId ?? data?.deviceId).toBe('device_register_001');
            expect(data?.device?.hostname ?? data?.hostname).toBe('test-device-register');
        });

        it('should validate required fields', async () => {
            const invalidDeviceData = {
                device_id: 'valid-device-id', // Valid device ID
                hostname: '', // Invalid: empty hostname
                device_type: 'raspberry-pi',
                architecture: 'arm64',
                ip_address: '192.168.1.100'
            };

            const request = new NextRequest('http://localhost:3000/api/devices', {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(invalidDeviceData)
            });

            const response = await devicesPOST(request);
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/devices/[id]', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_get',
                    deviceId: 'device_get_001',
                    hostname: 'Test Device Get',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.102',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it.skip('should get device details successfully', async () => {
            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceGET(request, { params: { id: testDeviceId } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data?.deviceId ?? data?.device?.deviceId).toBe('device_get_001');
            expect(data?.hostname ?? data?.device?.hostname).toBe('Test Device Get');
        });

        it('should return 404 for non-existent device', async () => {
            const request = new NextRequest('http://localhost:3000/api/devices/non-existent-id', {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceGET(request, { params: { id: 'non-existent-id' } });
            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/devices/[id]', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_update',
                    deviceId: 'device_update_001',
                    hostname: 'Test Device Update',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.103',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it('should update device successfully', async () => {
            const updateData = {
                hostname: 'Updated Device Name',
                location: 'Updated Location',
                description: 'Updated description'
            };

            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}`, {
                method: 'PUT',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const response = await devicePUT(request, { params: { id: testDeviceId } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data?.device?.hostname ?? data.device?.hostname).toBe('Updated Device Name');
        });
    });

    describe('DELETE /api/devices/[id]', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_delete',
                    deviceId: 'device_delete_001',
                    hostname: 'Test Device Delete',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.104',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it('should delete device successfully', async () => {
            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}`, {
                method: 'DELETE',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceDELETE(request, { params: { id: testDeviceId } });
            const data = await response.json();

            if (response.status !== 200) {
                console.error('DELETE test failed:', { status: response.status, data });
            }

            expect(response.status).toBe(200);
            expect(data.data?.message ?? data.message).toBe('Device deleted successfully');

            // Verify device is soft-deleted (deletedAt set)
            const deletedDevice = await prismaService.getClient().device.findUnique({ where: { id: testDeviceId } });
            expect(deletedDevice?.deletedAt).toBeDefined();
        });
    });

    describe('POST /api/devices/[id]/ssh', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_ssh',
                    deviceId: 'device_ssh_001',
                    hostname: 'Test Device SSH',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.105',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it('should validate SSH command input', async () => {
            const sshData = {
                command: '', // Invalid: empty command
                timeout: 30000
            };

            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}/ssh`, {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(sshData)
            });

            const response = await deviceSSH(request, { params: { id: testDeviceId } });
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/devices/[id]/metrics', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_metrics',
                    deviceId: 'device_metrics_001',
                    hostname: 'Test Device Metrics',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.106',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it('should get device metrics successfully', async () => {
            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}/metrics`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceMetrics(request, { params: { id: testDeviceId } });
            const data = await response.json();
            const payload = data.data ?? data;

            expect(response.status).toBe(200);
            expect(payload).toHaveProperty('metrics');
            expect(payload).toHaveProperty('period');
            expect(payload).toHaveProperty('resolution');
        });
    });

    describe('GET /api/devices/[id]/status', () => {
        beforeEach(async () => {
            const device = await prismaService.getClient().device.create({
                data: {
                    id: 'test_device_status',
                    deviceId: 'device_status_001',
                    hostname: 'Test Device Status',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.107',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId
                }
            });
            testDeviceId = device.id;
        });

        it('should get device status successfully', async () => {
            const request = new NextRequest(`http://localhost:3000/api/devices/${testDeviceId}/status`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceStatus(request, { params: { id: testDeviceId } });
            const data = await response.json();
            const payload = data.data ?? data;

            expect(response.status).toBe(200);
            expect(payload).toHaveProperty('device');
            expect(payload.device).toHaveProperty('status');
            expect(payload).toHaveProperty('metrics');
            expect(payload).toHaveProperty('connectivity');
        });
    });

    describe('POST /api/devices/bulk', () => {
        it.skip('should register multiple devices successfully', async () => {
            const bulkData = {
                devices: [
                    {
                        name: 'bulk-device-1',
                        ipAddress: '192.168.1.201',
                        sshUsername: 'pi',
                        sshPassword: 'raspberry',
                        sshPort: 22
                    },
                    {
                        name: 'bulk-device-2',
                        ipAddress: '192.168.1.202',
                        sshUsername: 'ubuntu',
                        sshPassword: 'ubuntu123',
                        sshPort: 22
                    }
                ]
            };

            const request = new NextRequest('http://localhost:3000/api/devices/bulk', {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(bulkData)
            });

            const response = await deviceBulk(request);
            const data = await response.json();

            expect([201, 207]).toContain(response.status); // 201 for all success, 207 for partial success
            expect(data).toHaveProperty('summary');
            expect(data.summary.total).toBe(2);
        });

        it('should validate bulk device data', async () => {
            const invalidBulkData = {
                devices: [
                    {
                        name: '', // Invalid: empty name
                        ipAddress: 'invalid-ip', // Invalid: not an IP
                        sshUsername: 'pi',
                        sshPassword: 'raspberry',
                        sshPort: 22
                    }
                ]
            };

            const request = new NextRequest('http://localhost:3000/api/devices/bulk', {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(invalidBulkData)
            });

            const response = await deviceBulk(request);
            expect(response.status).toBe(400);
        });
    });

    describe('Tenant Isolation', () => {
        let otherCustomerId: string;
        let otherUserId: string;

        beforeAll(async () => {
            // Create another customer for isolation testing
            const otherCustomer = await prismaService.getClient().customer.create({
                data: {
                    id: 'test_other_customer_device',
                    name: 'Other Customer Device',
                    slug: 'other-customer-device',
                    domain: 'other-device.com',
                    status: 'ACTIVE'
                }
            });
            otherCustomerId = otherCustomer.id;

            // Create user for other customer
            const hashedPassword = await hash('testPassword123', 12);
            const otherUser = await prismaService.getClient().user.create({
                data: {
                    id: 'test_other_user_device',
                    email: 'other@other-device.com',
                    username: 'otherdeviceuser',
                    password: hashedPassword,
                    role: 'ADMIN',
                    customerId: otherCustomerId
                }
            });
            otherUserId = otherUser.id;
        });

        afterAll(async () => {
            await prismaService.getClient().device.deleteMany({ where: { customerId: otherCustomerId } });
            await prismaService.getClient().user.delete({ where: { id: otherUserId } });
            await prismaService.getClient().customer.delete({ where: { id: otherCustomerId } });
        });

        it('should not access devices from different tenant', async () => {
            // Create device for other customer
            const otherDevice = await prismaService.getClient().device.create({
                data: {
                    id: 'test_other_device',
                    deviceId: 'other_device_001',
                    hostname: 'Other Device',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.2.100',
                    status: 'ONLINE',
                    customerId: otherCustomerId,
                    userId: otherUserId
                }
            });

            // Try to access other customer's device with first customer's user
            const request = new NextRequest(`http://localhost:3000/api/devices/${otherDevice.id}`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'x-user-id': testUserId,
                    'x-user-email': `deviceapi-${timestamp}@testdeviceapi.com`,
                    'x-user-role': 'ADMIN',
                    'x-customer-id': testCustomerId,
                    'cookie': `auth-token=${authToken}`
                }
            });

            const response = await deviceGET(request, { params: { id: otherDevice.id } });
            expect([403, 404]).toContain(response.status); // Should be forbidden or not found
        });
    });
});