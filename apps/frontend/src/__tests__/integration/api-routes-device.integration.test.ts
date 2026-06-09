/**
 * @vitest-environment node
 *
 * Device API integration tests — calls the real Express backend at
 * http://iotpilot-server-backend:3100 using node:http (avoids vi.fn() mock on global.fetch).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { hash } from 'bcryptjs';
import { sign as jwtSign } from 'jsonwebtoken';
import * as http from 'node:http';

const BACKEND_HOST = 'iotpilot-server-backend';
const BACKEND_PORT = 3100;
// Use the real JWT_SECRET from the container environment, not the test-overridden value
const JWT_SECRET = process.env.REAL_JWT_SECRET || 'local-Wyb3RXLMPA-xy6dUQXxPrpqu9ruoL';

type HttpResponse = { status: number; body: Record<string, unknown> };

function httpRequest(
    path: string,
    opts: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
        const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...opts.headers,
        };
        if (opts.body) reqHeaders['Content-Length'] = String(Buffer.byteLength(opts.body));

        const req = http.request(
            { hostname: BACKEND_HOST, port: BACKEND_PORT, path, method: opts.method ?? 'GET', headers: reqHeaders },
            (res) => {
                let raw = '';
                res.on('data', (c) => (raw += c));
                res.on('end', () => {
                    try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) }); }
                    catch { resolve({ status: res.statusCode ?? 0, body: { _raw: raw } as any }); }
                });
            },
        );
        req.on('error', reject);
        if (opts.body) req.write(opts.body);
        req.end();
    });
}

async function createAuthCookie(
    prisma: ReturnType<PrismaService['getClient']>,
    userId: string,
    customerId: string,
): Promise<string> {
    const token = jwtSign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    await prisma.session.create({
        data: {
            id: `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            token,
            userId,
            customerId,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
    });
    return token;
}

describe('Device API Routes Integration Tests', () => {
    let prismaService: PrismaService;
    let prisma: ReturnType<PrismaService['getClient']>;
    let testUserId: string;
    let testCustomerId: string;
    let testDevicePublicId: string;
    let authToken: string;
    let ts: number;

    beforeAll(async () => {
        prismaService = new PrismaService();
        prisma = prismaService.getClient();
        ts = Date.now();

        const customer = await prisma.customer.create({
            data: {
                name: `Test Customer Device API ${ts}`,
                slug: `test-cust-dev-${ts}`,
                domain: `testdevapi-${ts}.com`,
                status: 'ACTIVE',
            },
        });
        testCustomerId = customer.id;

        const pw = await hash('TestPass!123', 12);
        const user = await prisma.user.create({
            data: {
                email: `devapi-${ts}@testdevapi-${ts}.com`,
                username: `devapi${ts}`,
                password: pw,
                role: 'ADMIN',
                customerId: testCustomerId,
            },
        });
        testUserId = user.id;
    });

    beforeEach(async () => {
        await prisma.device.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.session.deleteMany({ where: { customerId: testCustomerId } });
        authToken = await createAuthCookie(prisma, testUserId, testCustomerId);
    });

    afterAll(async () => {
        if (testCustomerId) {
            await prisma.device.deleteMany({ where: { customerId: testCustomerId } });
            await prisma.session.deleteMany({ where: { customerId: testCustomerId } });
            await prisma.alert.deleteMany({ where: { customerId: testCustomerId } });
        }
        if (testUserId) await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
        if (testCustomerId) await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    });

    // -------------------------------------------------------------------------
    describe('GET /api/devices', () => {
        it('should require authentication', async () => {
            const res = await httpRequest('/api/devices');
            expect(res.status).toBe(401);
        });

        it('should list devices with valid auth', async () => {
            const res = await httpRequest('/api/devices', {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(200);
        });
    });

    // -------------------------------------------------------------------------
    describe('POST /api/devices', () => {
        it('should reject unauthenticated requests', async () => {
            const res = await httpRequest('/api/devices', {
                method: 'POST',
                body: JSON.stringify({ hostname: 'test' }),
            });
            expect(res.status).toBe(401);
        });

        it('should validate required fields', async () => {
            const res = await httpRequest('/api/devices', {
                method: 'POST',
                headers: { Cookie: `auth-token=${authToken}` },
                body: JSON.stringify({ hostname: '' }),
            });
            expect(res.status).toBe(400);
        });
    });

    // -------------------------------------------------------------------------
    describe('GET /api/devices/:id', () => {
        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `dget-${ts}`,
                    publicId: `pub-get-${ts}`,
                    name: 'Test Device Get',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.102',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
        });

        it('should return 404 for non-existent device', async () => {
            const res = await httpRequest('/api/devices/no-such-device', {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(404);
        });

        it('should get device details', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}`, {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(200);
            const device = (res.body as any).data ?? res.body;
            expect((device as any).hostname ?? (device as any).name).toBe('Test Device Get');
        });
    });

    // -------------------------------------------------------------------------
    describe('PUT /api/devices/:id', () => {
        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `dupdate-${ts}`,
                    publicId: `pub-update-${ts}`,
                    name: 'Test Device Update',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.103',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
        });

        it('should update device hostname', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}`, {
                method: 'PUT',
                headers: { Cookie: `auth-token=${authToken}` },
                body: JSON.stringify({ hostname: 'Updated Device Name', location: 'Lab' }),
            });
            expect(res.status).toBe(200);
        });
    });

    // -------------------------------------------------------------------------
    describe('DELETE /api/devices/:id', () => {
        let deviceInternalId: string;

        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `ddelete-${ts}`,
                    publicId: `pub-delete-${ts}`,
                    name: 'Test Device Delete',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.104',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
            deviceInternalId = d.id;
        });

        it('should soft-delete device', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}`, {
                method: 'DELETE',
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(200);

            const deleted = await prisma.device.findUnique({ where: { id: deviceInternalId } });
            expect(deleted?.deletedAt).toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    describe('POST /api/devices/:id/ssh', () => {
        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `dssh-${ts}`,
                    publicId: `pub-ssh-${ts}`,
                    name: 'Test Device SSH',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.105',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
        });

        it('should reject empty SSH command', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}/ssh`, {
                method: 'POST',
                headers: { Cookie: `auth-token=${authToken}` },
                body: JSON.stringify({ command: '', timeout: 30000 }),
            });
            expect(res.status).toBe(400);
        });
    });

    // -------------------------------------------------------------------------
    describe('GET /api/devices/:id/metrics', () => {
        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `dmetrics-${ts}`,
                    publicId: `pub-metrics-${ts}`,
                    name: 'Test Device Metrics',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.106',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
        });

        it('should return metrics structure', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}/metrics`, {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(200);
            const payload = (res.body as any).data ?? res.body;
            expect(payload).toHaveProperty('metrics');
            expect(payload).toHaveProperty('period');
        });
    });

    // -------------------------------------------------------------------------
    describe('GET /api/devices/:id/status', () => {
        beforeEach(async () => {
            const d = await prisma.device.create({
                data: {
                    deviceId: `dstatus-${ts}`,
                    publicId: `pub-status-${ts}`,
                    name: 'Test Device Status',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.1.107',
                    status: 'ONLINE',
                    customerId: testCustomerId,
                    userId: testUserId,
                },
            });
            testDevicePublicId = d.publicId!;
        });

        it('should return device status with connectivity', async () => {
            const res = await httpRequest(`/api/devices/${testDevicePublicId}/status`, {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect(res.status).toBe(200);
            const payload = (res.body as any).data ?? res.body;
            expect(payload).toHaveProperty('device');
            expect(payload).toHaveProperty('connectivity');
        });
    });

    // -------------------------------------------------------------------------
    describe('POST /api/devices/bulk', () => {
        it('should reject invalid bulk data', async () => {
            const res = await httpRequest('/api/devices/bulk', {
                method: 'POST',
                headers: { Cookie: `auth-token=${authToken}` },
                body: JSON.stringify({ devices: [{ name: '', ipAddress: 'bad-ip' }] }),
            });
            expect(res.status).toBe(400);
        });
    });

    // -------------------------------------------------------------------------
    describe('Tenant isolation', () => {
        let otherCustomerId: string;
        let otherUserId: string;

        beforeAll(async () => {
            const other = await prisma.customer.create({
                data: {
                    name: `Other Customer ${ts}`,
                    slug: `other-cust-dev-${ts}`,
                    domain: `other-dev-${ts}.com`,
                    status: 'ACTIVE',
                },
            });
            otherCustomerId = other.id;

            const pw = await hash('TestPass!123', 12);
            const otherUser = await prisma.user.create({
                data: {
                    email: `other-${ts}@other-dev-${ts}.com`,
                    username: `otherdev${ts}`,
                    password: pw,
                    role: 'ADMIN',
                    customerId: otherCustomerId,
                },
            });
            otherUserId = otherUser.id;
        });

        afterAll(async () => {
            await prisma.device.deleteMany({ where: { customerId: otherCustomerId } });
            await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {});
            await prisma.customer.delete({ where: { id: otherCustomerId } }).catch(() => {});
        });

        it('should not expose devices from another tenant', async () => {
            const otherDevice = await prisma.device.create({
                data: {
                    deviceId: `other-iso-${ts}`,
                    publicId: `pub-iso-${ts}`,
                    name: 'Other Tenant Device',
                    deviceType: 'PI_4',
                    architecture: 'arm64',
                    ipAddress: '192.168.2.100',
                    status: 'ONLINE',
                    customerId: otherCustomerId,
                    userId: otherUserId,
                },
            });

            const res = await httpRequest(`/api/devices/${otherDevice.publicId}`, {
                headers: { Cookie: `auth-token=${authToken}` },
            });
            expect([403, 404]).toContain(res.status);
        });
    });
});
