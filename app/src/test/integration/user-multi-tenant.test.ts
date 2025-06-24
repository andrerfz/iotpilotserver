import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {PrismaUserRepository} from '@/lib/user/infrastructure/repositories/prisma-user.repository';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {UserMapper} from '@/lib/user/infrastructure/mappers/user.mapper';
import {InMemoryEventBus} from '@//lib/shared/application/bus/event.bus';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {withTenant, TenantContext} from '@/lib/tenant-middleware';

describe('User Multi-Tenant Integration', () => {
    let prisma: PrismaClient;
    let userRepository: PrismaUserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let eventBus: InMemoryEventBus;
    let registerUserHandler: RegisterUserHandler;
    let customerId1: CustomerId;
    let customerId2: CustomerId;

    beforeEach(async () => {
        prisma = new PrismaClient();
        await prisma.$connect();

        // Clean database
        await prisma.session.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.userPreference.deleteMany();
        await prisma.user.deleteMany();
        await prisma.deviceMetric.deleteMany();
        await prisma.alert.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();

        // Create test customers
        const customer1 = await prisma.customer.create({
            data: {
                id: 'customer-1',
                name: 'Customer 1',
                slug: 'customer-1',
                domain: 'customer1.example.com'
            }
        });

        const customer2 = await prisma.customer.create({
            data: {
                id: 'customer-2',
                name: 'Customer 2',
                slug: 'customer-2',
                domain: 'customer2.example.com'
            }
        });

        customerId1 = CustomerId.create(customer1.id);
        customerId2 = CustomerId.create(customer2.id);

        // Setup services
        const userMapper = new UserMapper();
        userRepository = new PrismaUserRepository(userMapper);
        passwordHasher = new BcryptPasswordHasher();
        eventBus = new InMemoryEventBus();
        registerUserHandler = new RegisterUserHandler(userRepository, passwordHasher, eventBus);
    });

    afterEach(async () => {
        await prisma.session.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.userPreference.deleteMany();
        await prisma.user.deleteMany();
        await prisma.deviceMetric.deleteMany();
        await prisma.alert.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.$disconnect();
    });

    describe('Tenant Isolation', () => {
        it('should isolate users between tenants', async () => {
            // Create user in tenant 1
            const tenantContext1: TenantContext = {
                customerId: customerId1.getValue(),
                userId: 'admin-1',
                role: 'CUSTOMER_ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext1, async () => {
                const command1 = RegisterUserCommand.createForTenant(
                    'user1@customer1.com',
                    'Password123!',
                    customerId1.getValue(),
                    'USER',
                    'user1_customer1'
                );
                await registerUserHandler.handle(command1);
            });

            // Create user in tenant 2
            const tenantContext2: TenantContext = {
                customerId: customerId2.getValue(),
                userId: 'admin-2',
                role: 'CUSTOMER_ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext2, async () => {
                const command2 = RegisterUserCommand.createForTenant(
                    'user1@customer2.com',
                    'Password123!',
                    customerId2.getValue(),
                    'USER',
                    'user1_customer2'
                );
                await registerUserHandler.handle(command2);
            });

            // Verify tenant 1 can only see their users
            await withTenant(tenantContext1, async () => {
                const tenant1Users = await userRepository.findAllInTenant(customerId1);
                expect(tenant1Users).toHaveLength(1);
                expect(tenant1Users[0].getEmail().getValue()).toBe('user1@customer1.com');
            });

            // Verify tenant 2 can only see their users
            await withTenant(tenantContext2, async () => {
                const tenant2Users = await userRepository.findAllInTenant(customerId2);
                expect(tenant2Users).toHaveLength(1);
                expect(tenant2Users[0].getEmail().getValue()).toBe('user1@customer2.com');
            });
        });

        it('should allow SUPERADMIN to access all tenants', async () => {
            // Create SUPERADMIN user
            const superAdminContext: TenantContext = {
                customerId: null,
                userId: 'superadmin-1',
                role: 'SUPERADMIN',
                isSuperAdmin: true
            };

            await withTenant(superAdminContext, async () => {
                const superAdminCommand = RegisterUserCommand.createSuperAdmin(
                    'superadmin@platform.com',
                    'SuperPassword123!',
                    'superadmin'
                );
                await registerUserHandler.handle(superAdminCommand);

                // Create users in different tenants
                const command1 = RegisterUserCommand.createForTenant(
                    'user1@customer1.com',
                    'Password123!',
                    customerId1.getValue(),
                    'USER',
                    'user1_customer1_admin'
                );
                await registerUserHandler.handle(command1);

                const command2 = RegisterUserCommand.createForTenant(
                    'user2@customer2.com',
                    'Password123!',
                    customerId2.getValue(),
                    'USER',
                    'user2_customer2_admin'
                );
                await registerUserHandler.handle(command2);

                // SUPERADMIN should see all users
                const allUsers = await userRepository.findAll();
                expect(allUsers).toHaveLength(3); // 1 SUPERADMIN + 2 tenant users

                // SUPERADMIN should access tenant-specific users
                const tenant1Users = await userRepository.findAllInTenant(customerId1);
                expect(tenant1Users).toHaveLength(1);

                const tenant2Users = await userRepository.findAllInTenant(customerId2);
                expect(tenant2Users).toHaveLength(1);
            });
        });

        it('should prevent cross-tenant user access', async () => {
            // Create user in tenant 1
            const tenantContext1: TenantContext = {
                customerId: customerId1.getValue(),
                userId: 'admin-1',
                role: 'CUSTOMER_ADMIN',
                isSuperAdmin: false
            };

            let user1Id: string;
            await withTenant(tenantContext1, async () => {
                const command = RegisterUserCommand.createForTenant(
                    'user1@customer1.com',
                    'Password123!',
                    customerId1.getValue(),
                    'USER',
                    'user1_customer1_cross'
                );
                await registerUserHandler.handle(command);

                const users = await userRepository.findAllInTenant(customerId1);
                user1Id = users[0].getId().getValue();
            });

            // Try to access user from tenant 2 context
            const tenantContext2: TenantContext = {
                customerId: customerId2.getValue(),
                userId: 'admin-2',
                role: 'CUSTOMER_ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext2, async () => {
                const users = await userRepository.findAllInTenant(customerId2);
                expect(users).toHaveLength(0); // Should not see tenant 1 users
            });
        });
    });

    describe('SUPERADMIN Isolation', () => {
        it('should hide SUPERADMIN users from tenant views', async () => {
            // Create SUPERADMIN
            const superAdminContext: TenantContext = {
                customerId: null,
                userId: 'superadmin-1',
                role: 'SUPERADMIN',
                isSuperAdmin: true
            };

            await withTenant(superAdminContext, async () => {
                const superAdminCommand = RegisterUserCommand.createSuperAdmin(
                    'superadmin@platform.com',
                    'SuperPassword123!',
                    'superadmin_hide'
                );
                await registerUserHandler.handle(superAdminCommand);
            });

            // Create tenant user
            const tenantContext: TenantContext = {
                customerId: customerId1.getValue(),
                userId: 'admin-1',
                role: 'CUSTOMER_ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext, async () => {
                const userCommand = RegisterUserCommand.createForTenant(
                    'user1@customer1.com',
                    'Password123!',
                    customerId1.getValue(),
                    'USER',
                    'user1_customer1_hide'
                );
                await registerUserHandler.handle(userCommand);

                // Tenant should only see their own users, not SUPERADMIN
                const tenantUsers = await userRepository.findAllInTenant(customerId1);
                expect(tenantUsers).toHaveLength(1);
                expect(tenantUsers[0].getEmail().getValue()).toBe('user1@customer1.com');
                expect(tenantUsers[0].isSuperAdmin()).toBe(false);
            });
        });
    });
});
