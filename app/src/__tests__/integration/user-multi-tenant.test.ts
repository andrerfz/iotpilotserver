import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {PrismaUserRepository} from '@/lib/user/infrastructure/repositories/prisma-user.repository';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {UserMapper} from '@/lib/user/infrastructure/mappers/user.mapper';
import {InMemoryEventBus} from '@//lib/shared/application/bus/event.bus';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {TenantContext, withTenant} from '@/lib/tenant-middleware';

type PrismaClient = ReturnType<PrismaService['getClient']>;

describe('User Multi-Tenant Integration', () => {
    let prismaService: PrismaService;
    let prisma: PrismaClient;
    let userRepository: PrismaUserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let eventBus: InMemoryEventBus;
    let registerUserHandler: RegisterUserHandler;
    let customerId1: CustomerId;
    let customerId2: CustomerId;

    beforeEach(async () => {
        prismaService = new PrismaService();
        prisma = prismaService.getClient();
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
        // Clean up in proper order to avoid foreign key violations
        await prisma.session.deleteMany();
        await prisma.apiKey.deleteMany();
        await prisma.userPreference.deleteMany();
        await prisma.deviceMetric.deleteMany();
        await prisma.alert.deleteMany();
        await prisma.device.deleteMany();
        await prisma.user.deleteMany(); // Delete users before customers
        await prisma.customer.deleteMany();
        await prismaService.close();
    });

    describe('Tenant Isolation', () => {
        it('should isolate users between tenants', async () => {
            // Create user in tenant 1
            const tenantContext1: TenantContext = {
                customerId: customerId1.getValue(),
                userId: 'admin-1',
                role: 'ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext1, async () => {
                const command1 = new RegisterUserCommand(
                    'user1@customer1.com',
                    'SecureP@ssw0rd2024!',
                    'user1_customer1',
                    'USER',
                    customerId1.getValue(),
                    'ACTIVE'
                );
                await registerUserHandler.handle(command1);
            });

            // Create user in tenant 2
            const tenantContext2: TenantContext = {
                customerId: customerId2.getValue(),
                userId: 'admin-2',
                role: 'ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext2, async () => {
                const command2 = new RegisterUserCommand(
                    'user1@customer2.com',
                    'SecureP@ssw0rd2024!',
                    'user1_customer2',
                    'USER',
                    customerId2.getValue(),
                    'ACTIVE'
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
                const superAdminCommand = new RegisterUserCommand(
                    'superadmin@platform.com',
                    'Sup3rAdm!n@2024',
                    'superadmin',
                    'SUPERADMIN',
                    null,  // SUPERADMIN has no customerId
                    'ACTIVE'
                );
                await registerUserHandler.handle(superAdminCommand);

                // Create users in different tenants
                const command1 = new RegisterUserCommand(
                    'user1@customer1.com',
                    'SecureP@ssw0rd2024!',
                    'user1_customer1_admin',
                    'USER',
                    customerId1.getValue(),
                    'ACTIVE'
                );
                await registerUserHandler.handle(command1);

                const command2 = new RegisterUserCommand(
                    'user2@customer2.com',
                    'SecureP@ssw0rd2024!',
                    'user2_customer2_admin',
                    'USER',
                    customerId2.getValue(),
                    'ACTIVE'
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
                role: 'ADMIN',
                isSuperAdmin: false
            };

            let user1Id: string;
            await withTenant(tenantContext1, async () => {
                const command = new RegisterUserCommand(
                    'user1@customer1.com',
                    'SecureP@ssw0rd2024!',
                    'user1_customer1_cross',
                    'USER',
                    customerId1.getValue(),
                    'ACTIVE'
                );
                await registerUserHandler.handle(command);

                const users = await userRepository.findAllInTenant(customerId1);
                user1Id = users[0].getId().getValue();
            });

            // Try to access user from tenant 2 context
            const tenantContext2: TenantContext = {
                customerId: customerId2.getValue(),
                userId: 'admin-2',
                role: 'ADMIN',
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
                const superAdminCommand = new RegisterUserCommand(
                    'superadmin@platform.com',
                    'Sup3rAdm!n@2024',
                    'superadmin_hide',
                    'SUPERADMIN',
                    null,  // SUPERADMIN has no customerId
                    'ACTIVE'
                );
                await registerUserHandler.handle(superAdminCommand);
            });

            // Create tenant user
            const tenantContext: TenantContext = {
                customerId: customerId1.getValue(),
                userId: 'admin-1',
                role: 'ADMIN',
                isSuperAdmin: false
            };

            await withTenant(tenantContext, async () => {
                const userCommand = new RegisterUserCommand(
                    'user1@customer1.com',
                    'SecureP@ssw0rd2024!',
                    'user1_customer1_hide',
                    'USER',
                    customerId1.getValue(),
                    'ACTIVE'
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
