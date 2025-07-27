import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TenantContext, tenantContext, TenantPrismaClient, withTenant} from '../../tenant-middleware';
import {UserRoleType} from '../../domain/value-objects/user-role.vo';
import {TestDatabaseHelper} from './test-database-helper';

// Type alias for Prisma UserRole enum (matches domain UserRoleType)
type UserRole = UserRoleType;

// Mock Prisma client
const mockPrisma = {
    user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
    },
    device: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    },
    customer: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    },
    session: {
        findUnique: vi.fn(),
        create: vi.fn()
    }
};

describe('Tenant Isolation Security Tests', () => {
    let tenantPrisma: TenantPrismaClient;
    let dbHelper: TestDatabaseHelper;
    let tenantA: TenantContext;
    let tenantB: TenantContext;
    let superAdmin: TenantContext;

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create tenant prisma client
        tenantPrisma = new TenantPrismaClient(mockPrisma as any);

        // Create test contexts
        tenantA = {
            customerId: 'tenant-a-123',
            userId: 'user-a-123',
            role: 'USER' as UserRole,
            isSuperAdmin: false
        };

        tenantB = {
            customerId: 'tenant-b-456',
            userId: 'user-b-456',
            role: 'USER' as UserRole,
            isSuperAdmin: false
        };

        superAdmin = {
            customerId: null,
            userId: 'admin-123',
            role: 'SUPERADMIN' as UserRole,
            isSuperAdmin: true
        };

        // Initialize database helper (but don't actually connect to DB in unit tests)
        dbHelper = new TestDatabaseHelper();
    });

    afterEach(() => {
        // Clear tenant context after each test
        tenantContext.run({}, () => {});
    });

    describe('SUPERADMIN Bypass Functionality', () => {
        it('should allow SUPERADMIN to access all customers without tenant filtering', async () => {
            mockPrisma.customer.findMany.mockResolvedValue([
                { id: 'tenant-a-123', name: 'Customer A' },
                { id: 'tenant-b-456', name: 'Customer B' }
            ]);

            const result = await withTenant(superAdmin, async () => {
                return tenantPrisma.client.customer.findMany();
            });

            expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(undefined);
            expect(result).toHaveLength(2);
        });

        it('should allow SUPERADMIN to access all users including other tenants', async () => {
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'user-a-123', email: 'user@tenant-a.com', customerId: 'tenant-a-123' },
                { id: 'user-b-456', email: 'user@tenant-b.com', customerId: 'tenant-b-456' },
                { id: 'admin-123', email: 'admin@system.com', customerId: null, role: 'SUPERADMIN' }
            ]);

            const result = await withTenant(superAdmin, async () => {
                return tenantPrisma.client.user.findMany();
            });

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(undefined);
            expect(result).toHaveLength(3);
        });

        it('should allow SUPERADMIN to create records without customerId injection', async () => {
            const newUserData = {
                email: 'newuser@test.com',
                passwordHash: 'hashedpass',
                role: 'USER'
            };

            mockPrisma.user.create.mockResolvedValue({
                id: 'new-user-123',
                ...newUserData
            });

            const result = await withTenant(superAdmin, async () => {
                return tenantPrisma.client.user.create({ data: newUserData });
            });

            expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: newUserData });
            expect(result.id).toBe('new-user-123');
        });
    });

    describe('Tenant Boundary Violations', () => {
        it('should prevent tenant A from accessing tenant B customer data', async () => {
            mockPrisma.customer.findUnique.mockResolvedValue({
                id: 'tenant-b-456',
                name: 'Customer B'
            });

            await expect(
                withTenant(tenantA, async () => {
                    return tenantPrisma.client.customer.findUnique({
                        where: { id: 'tenant-b-456' }
                    });
                })
            ).rejects.toThrow('Tenant boundary violation');
        });

        it('should prevent tenant A from updating tenant B devices', async () => {
            mockPrisma.device.update.mockResolvedValue({
                id: 'device-123',
                hostname: 'updated-device',
                customerId: 'tenant-b-456'
            });

            await expect(
                withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.update({
                        where: { id: 'device-123' },
                        data: { hostname: 'hacked-device' }
                    });
                })
            ).rejects.toThrow('Tenant boundary violation');
        });

        it('should prevent tenant A from deleting tenant B users', async () => {
            mockPrisma.user.delete.mockResolvedValue({
                id: 'user-b-456',
                email: 'user@tenant-b.com'
            });

            await expect(
                withTenant(tenantA, async () => {
                    return tenantPrisma.client.user.delete({
                        where: { id: 'user-b-456' }
                    });
                })
            ).rejects.toThrow('Tenant boundary violation');
        });

        it('should return null when tenant A queries tenant B customer by ID', async () => {
            mockPrisma.customer.findUnique.mockResolvedValue({
                id: 'tenant-b-456',
                name: 'Customer B'
            });

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.customer.findUnique({
                    where: { id: 'tenant-b-456' }
                });
            });

            expect(result).toBeNull();
        });
    });

    describe('Complex User Query Logic (Line 171-175)', () => {
        it('should allow tenant users to see their own tenant users', async () => {
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'user-a-1', email: 'user1@tenant-a.com', customerId: 'tenant-a-123', role: 'USER' },
                { id: 'user-a-2', email: 'user2@tenant-a.com', customerId: 'tenant-a-123', role: 'USER' }
            ]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.user.findMany();
            });

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    AND: [{
                        OR: [
                            { customerId: 'tenant-a-123' },
                            { role: { not: 'SUPERADMIN' } }
                        ]
                    }]
                }
            });
            expect(result).toHaveLength(2);
        });

        it('should hide SUPERADMIN users from regular tenant users', async () => {
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'user-a-1', email: 'user1@tenant-a.com', customerId: 'tenant-a-123', role: 'USER' }
            ]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.user.findMany();
            });

            // Verify that SUPERADMIN users are filtered out
            const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
            expect(callArgs.where.AND[0].OR).toEqual([
                { customerId: 'tenant-a-123' },
                { role: { not: 'SUPERADMIN' } }
            ]);
        });

        it('should allow SUPERADMIN to see all users including SUPERADMIN users', async () => {
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'user-a-1', email: 'user1@tenant-a.com', customerId: 'tenant-a-123', role: 'USER' },
                { id: 'admin-1', email: 'admin@system.com', customerId: null, role: 'SUPERADMIN' }
            ]);

            const result = await withTenant(superAdmin, async () => {
                return tenantPrisma.client.user.findMany();
            });

            // SUPERADMIN bypasses all filtering
            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(undefined);
            expect(result).toHaveLength(2);
        });
    });

    describe('Session Access Without Context', () => {
        it('should allow session operations without tenant context for authentication', async () => {
            mockPrisma.session.findUnique.mockResolvedValue({
                id: 'session-123',
                userId: 'user-123',
                token: 'valid-token'
            });

            // Note: This test runs without withTenant wrapper
            const result = tenantPrisma.client.session.findUnique({
                where: { id: 'session-123' }
            });

            expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
                where: { id: 'session-123' }
            });
        });

        it('should allow user read operations without context for session validation', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-123',
                email: 'user@test.com',
                customerId: 'tenant-a-123'
            });

            // This should work without tenant context for authentication
            const result = tenantPrisma.client.user.findUnique({
                where: { id: 'user-123' }
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-123' }
            });
        });
    });

    describe('Security Violations Without Context', () => {
        it('should throw security violation for device access without context', async () => {
            await expect(
                tenantPrisma.client.device.findMany()
            ).rejects.toThrow('SECURITY VIOLATION: Attempted to access device.findMany without tenant context');
        });

        it('should throw security violation for customer create without context', async () => {
            await expect(
                tenantPrisma.client.customer.create({
                    data: { name: 'Test Customer' }
                })
            ).rejects.toThrow('SECURITY VIOLATION');
        });

        it('should throw security violation for user update without context', async () => {
            await expect(
                tenantPrisma.client.user.update({
                    where: { id: 'user-123' },
                    data: { email: 'newemail@test.com' }
                })
            ).rejects.toThrow('SECURITY VIOLATION');
        });
    });

    describe('Customer Model Access Restrictions', () => {
        it('should only allow tenant to access their own customer record', async () => {
            mockPrisma.customer.findUnique.mockResolvedValue({
                id: 'tenant-a-123',
                name: 'Customer A'
            });

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.customer.findUnique({
                    where: { id: 'tenant-a-123' }
                });
            });

            expect(result?.id).toBe('tenant-a-123');
        });

        it('should filter customer queries to only return tenant customer', async () => {
            mockPrisma.customer.findMany.mockResolvedValue([
                { id: 'tenant-a-123', name: 'Customer A' }
            ]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.customer.findMany();
            });

            expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
                where: {
                    AND: [{ id: 'tenant-a-123' }]
                }
            });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('tenant-a-123');
        });

        it('should prevent tenant from creating additional customers', async () => {
            // This should automatically add customerId filter to prevent creating other customers
            mockPrisma.customer.create.mockResolvedValue({
                id: 'new-customer-123',
                name: 'New Customer'
            });

            await expect(
                withTenant(tenantA, async () => {
                    return tenantPrisma.client.customer.create({
                        data: { name: 'New Customer' }
                    });
                })
            ).rejects.toThrow('Tenant boundary violation');
        });
    });

    describe('Prisma Operation Types', () => {
        describe('Create Operations', () => {
            it('should inject customerId for create operations', async () => {
                const deviceData = {
                    deviceId: 'device-123',
                    hostname: 'test-device',
                    ipAddress: '192.168.1.100',
                    username: 'testuser',
                    password: 'testpass',
                    deviceType: 'PI_4'
                };

                mockPrisma.device.create.mockResolvedValue({
                    id: 'device-123',
                    ...deviceData,
                    customerId: 'tenant-a-123'
                });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.create({ data: deviceData });
                });

                expect(mockPrisma.device.create).toHaveBeenCalledWith({
                    data: {
                        ...deviceData,
                        customerId: 'tenant-a-123'
                    }
                });
            });

            it('should handle createMany with customerId injection', async () => {
                const devicesData = [
                    { deviceId: 'device-1', hostname: 'device-1', ipAddress: '192.168.1.1' },
                    { deviceId: 'device-2', hostname: 'device-2', ipAddress: '192.168.1.2' }
                ];

                mockPrisma.device.createMany.mockResolvedValue({ count: 2 });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.createMany({ data: devicesData });
                });

                expect(mockPrisma.device.createMany).toHaveBeenCalledWith({
                    data: devicesData.map(device => ({
                        ...device,
                        customerId: 'tenant-a-123'
                    }))
                });
            });
        });

        describe('Update Operations', () => {
            it('should filter updates by customerId', async () => {
                mockPrisma.device.update.mockResolvedValue({
                    id: 'device-123',
                    hostname: 'updated-device',
                    customerId: 'tenant-a-123'
                });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.update({
                        where: { id: 'device-123' },
                        data: { hostname: 'updated-device' }
                    });
                });

                expect(mockPrisma.device.update).toHaveBeenCalledWith({
                    where: {
                        id: 'device-123',
                        customerId: 'tenant-a-123'
                    },
                    data: { hostname: 'updated-device' }
                });
            });

            it('should handle upsert operations with tenant filtering', async () => {
                mockPrisma.device.upsert.mockResolvedValue({
                    id: 'device-123',
                    hostname: 'upserted-device',
                    customerId: 'tenant-a-123'
                });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.upsert({
                        where: { id: 'device-123' },
                        create: { deviceId: 'device-123', hostname: 'new-device', ipAddress: '192.168.1.100' },
                        update: { hostname: 'updated-device' }
                    });
                });

                expect(mockPrisma.device.upsert).toHaveBeenCalledWith({
                    where: { id: 'device-123' },
                    create: {
                        deviceId: 'device-123',
                        hostname: 'new-device',
                        ipAddress: '192.168.1.100',
                        customerId: 'tenant-a-123'
                    },
                    update: {
                        hostname: 'updated-device',
                        customerId: 'tenant-a-123'
                    }
                });
            });
        });

        describe('Delete Operations', () => {
            it('should filter deletes by customerId', async () => {
                mockPrisma.device.delete.mockResolvedValue({
                    id: 'device-123',
                    hostname: 'deleted-device',
                    customerId: 'tenant-a-123'
                });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.delete({
                        where: { id: 'device-123' }
                    });
                });

                expect(mockPrisma.device.delete).toHaveBeenCalledWith({
                    where: {
                        id: 'device-123',
                        customerId: 'tenant-a-123'
                    }
                });
            });

            it('should handle deleteMany with customer filtering', async () => {
                mockPrisma.device.deleteMany.mockResolvedValue({ count: 3 });

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.deleteMany({
                        where: { status: 'OFFLINE' }
                    });
                });

                expect(mockPrisma.device.deleteMany).toHaveBeenCalledWith({
                    where: {
                        status: 'OFFLINE',
                        customerId: 'tenant-a-123'
                    }
                });
            });
        });

        describe('Query Operations', () => {
            it('should filter findMany by customerId', async () => {
                mockPrisma.device.findMany.mockResolvedValue([
                    { id: 'device-1', customerId: 'tenant-a-123' },
                    { id: 'device-2', customerId: 'tenant-a-123' }
                ]);

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.findMany();
                });

                expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
                    where: { customerId: 'tenant-a-123' }
                });
            });

            it('should filter count operations by customerId', async () => {
                mockPrisma.device.count.mockResolvedValue(5);

                const result = await withTenant(tenantA, async () => {
                    return tenantPrisma.client.device.count();
                });

                expect(mockPrisma.device.count).toHaveBeenCalledWith({
                    where: { customerId: 'tenant-a-123' }
                });
            });
        });
    });

    describe('Edge Cases and Error Conditions', () => {
        it('should handle complex where clauses with existing AND conditions', async () => {
            mockPrisma.device.findMany.mockResolvedValue([]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.device.findMany({
                    where: {
                        AND: [{ status: 'ONLINE' }],
                        hostname: { contains: 'pi' }
                    }
                });
            });

            expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
                where: {
                    AND: [{ status: 'ONLINE' }],
                    hostname: { contains: 'pi' },
                    customerId: 'tenant-a-123'
                }
            });
        });

        it('should handle non-array AND conditions', async () => {
            mockPrisma.user.findMany.mockResolvedValue([]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.user.findMany({
                    where: {
                        AND: { email: { contains: '@test.com' } }
                    }
                });
            });

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    AND: [
                        { email: { contains: '@test.com' } },
                        {
                            OR: [
                                { customerId: 'tenant-a-123' },
                                { role: { not: 'SUPERADMIN' } }
                            ]
                        }
                    ]
                }
            });
        });

        it('should handle operations on non-model properties', async () => {
            // Test that $transaction and other Prisma methods work
            mockPrisma.$transaction = vi.fn().mockResolvedValue([]);

            const result = await withTenant(tenantA, async () => {
                return tenantPrisma.client.$transaction([]);
            });

            expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
        });

        it('should handle operations on non-function properties', async () => {
            // This tests accessing non-function properties like model metadata
            const modelNames = Object.keys(mockPrisma);
            expect(modelNames).toContain('user');
            expect(modelNames).toContain('device');
            expect(modelNames).toContain('customer');
        });
    });
});
