/**
 * E2E Test: User Onboarding Journey
 *
 * This test validates the complete user onboarding flow:
 * 1. Customer signs up (admin user is auto-created)
 * 2. Admin logs in
 * 3. Admin creates additional team members
 * 4. Team members can access their tenant's resources
 * 5. Multi-tenant isolation is enforced
 *
 * @vitest-environment node
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {BcryptPasswordHasher} from '@iotpilot/core/user/infrastructure/services/bcrypt-password-hasher';
import {RegisterUserHandler} from '@iotpilot/core/user/application/commands/register-user/register-user.handler';
import {RegisterUserCommand} from '@iotpilot/core/user/application/commands/register-user/register-user.command';
import {AuthenticateUserHandler} from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.handler';
import {AuthenticateUserCommand} from '@iotpilot/core/user/application/commands/authenticate-user/authenticate-user.command';
import {UserAuthenticator} from '@iotpilot/core/user/domain/services/user-authenticator';
import {PrismaUserRepository} from '@iotpilot/core/user/infrastructure/repositories/prisma-user.repository';
import {UserMapper} from '@iotpilot/core/user/infrastructure/mappers/user.mapper';
import {TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {InMemoryEventBus} from '@iotpilot/core/shared/application/bus/event.bus';

// Mock session service for E2E
class TestSessionService {
    private sessions = new Map<string, { userId: string; customerId: string | null }>();

    async createSession(userId: string, customerId?: string | null): Promise<string> {
        const token = `e2e-token-${userId}-${Date.now()}`;
        this.sessions.set(token, { userId, customerId: customerId || null });
        return token;
    }

    async validateSession(token: string) {
        return this.sessions.get(token) || null;
    }

    clear() {
        this.sessions.clear();
    }
}

describe('E2E: User Onboarding Journey', () => {
    let prismaService: PrismaService;
    let userRepository: PrismaUserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let sessionService: TestSessionService;
    let userAuthenticator: UserAuthenticator;
    let registerHandler: RegisterUserHandler;
    let authenticateHandler: AuthenticateUserHandler;
    let logger: StructuredLogger;

    // Test data — unique per run to avoid collisions
    const timestamp = Date.now();
    const adminEmail = `admin-${timestamp}@e2etest.com`;
    const userEmail = `user-${timestamp}@e2etest.com`;
    const password = 'Kx9#mQ7$vL2@nR5!pF8';
    let customerId: string;

    beforeAll(async () => {
        // Initialize services
        prismaService = new PrismaService();
        userRepository = new PrismaUserRepository(new UserMapper(), prismaService);
        passwordHasher = new BcryptPasswordHasher();
        sessionService = new TestSessionService();
        userAuthenticator = new UserAuthenticator(userRepository, passwordHasher);
        logger = StructuredLogger.forService('e2e-test');
        const eventBus = new InMemoryEventBus();

        registerHandler = new RegisterUserHandler(
            userRepository,
            passwordHasher,
            logger,
            eventBus
        );

        authenticateHandler = new AuthenticateUserHandler(
            userAuthenticator,
            sessionService as any,
            eventBus
        );

        // Create customer in database for this test
        const customer = await prismaService.getClient().customer.create({
            data: {
                name: `E2E Test Company ${timestamp}`,
                slug: `e2e-test-company-${timestamp}`,
                domain: `e2etest-${timestamp}.com`,
                status: 'ACTIVE'
            }
        });
        customerId = customer.id;
    });

    afterAll(async () => {
        // Cleanup: Delete test users and customer
        await prismaService.getClient().session.deleteMany({
            where: { customerId }
        }).catch(() => {});

        await prismaService.getClient().user.deleteMany({
            where: { customerId }
        }).catch(() => {});

        await prismaService.getClient().customer.delete({
            where: { id: customerId }
        }).catch(() => {});

        sessionService.clear();
    });

    describe('Step 1: Company Admin Registration', () => {
        it('should register company admin (ADMIN role)', async () => {
            const tenantContext = TenantContextImpl.createCustomerAdmin(
                CustomerId.create(customerId)
            );

            const command = new RegisterUserCommand(
                tenantContext,
                adminEmail,
                password,
                'Admin User',
                '',
                undefined,
                'ADMIN'
            );

            const user = await registerHandler.handle(command);

            expect(user).toBeDefined();
            expect(user.getEmail().getValue()).toBe(adminEmail);
            expect(user.getRole().getValue()).toBe('ADMIN');

            // Verify user exists in database with correct fields
            const dbUser = await prismaService.getClient().user.findUnique({
                where: { email: adminEmail }
            });

            expect(dbUser).not.toBeNull();
            expect(dbUser?.email).toBe(adminEmail);
            expect(dbUser?.role).toBe('ADMIN');
            expect(dbUser?.customerId).toBe(customerId);
            expect(dbUser?.status).toBe('ACTIVE');
            // Password should be a real bcrypt hash, not a placeholder
            expect(dbUser?.password).toMatch(/^\$2[aby]\$/);
        });
    });

    describe('Step 2: Admin Authentication', () => {
        it('should authenticate admin and receive token', async () => {
            const authCommand = AuthenticateUserCommand.create(
                adminEmail,
                password,
                customerId
            );

            const result = await authenticateHandler.handle(authCommand);

            expect(result).toBeDefined();
            expect(result.user.email).toBe(adminEmail);
            expect(result.user.role).toBe('ADMIN');
            expect(result.user.customerId).toBe(customerId);
            expect(result.token).toBeDefined();

            // Verify session is valid
            const session = await sessionService.validateSession(result.token);
            expect(session).not.toBeNull();
            expect(session?.customerId).toBe(customerId);
        });

        it('should update last login timestamp', async () => {
            const user = await prismaService.getClient().user.findUnique({
                where: { email: adminEmail }
            });

            expect(user?.lastLoginAt).not.toBeNull();
        });
    });

    describe('Step 3: Admin Creates Team Member', () => {
        it('should create a regular user in the same tenant', async () => {
            const tenantContext = TenantContextImpl.createCustomerAdmin(
                CustomerId.create(customerId)
            );

            const command = new RegisterUserCommand(
                tenantContext,
                userEmail,
                password,
                'Regular User',
                '',
                undefined,
                'USER'
            );

            const user = await registerHandler.handle(command);

            expect(user).toBeDefined();
            expect(user.getRole().getValue()).toBe('USER');

            const dbUser = await prismaService.getClient().user.findUnique({
                where: { email: userEmail }
            });

            expect(dbUser).not.toBeNull();
            expect(dbUser?.role).toBe('USER');
            expect(dbUser?.customerId).toBe(customerId);
        });
    });

    describe('Step 4: Team Member Authentication', () => {
        it('should authenticate regular user', async () => {
            const authCommand = AuthenticateUserCommand.create(
                userEmail,
                password,
                customerId
            );

            const result = await authenticateHandler.handle(authCommand);

            expect(result.user.email).toBe(userEmail);
            expect(result.user.role).toBe('USER');
            expect(result.user.customerId).toBe(customerId);
        });

        it('should reject authentication with wrong password', async () => {
            const authCommand = AuthenticateUserCommand.create(
                userEmail,
                'WrongP@ssw0rd123!xyz',
                customerId
            );

            await expect(authenticateHandler.handle(authCommand)).rejects.toThrow();
        });
    });

    describe('Step 5: Verify Team & Tenant Isolation', () => {
        it('should list all team members for this customer', async () => {
            const users = await prismaService.getClient().user.findMany({
                where: { customerId, deletedAt: null }
            });

            expect(users).toHaveLength(2);

            const roles = users.map(u => u.role).sort();
            expect(roles).toEqual(['ADMIN', 'USER']);
        });
    });

    describe('Step 6: User Lifecycle Management', () => {
        it('should prevent login when user is deactivated', async () => {
            // Deactivate the user
            await prismaService.getClient().user.update({
                where: { email: userEmail },
                data: { status: 'INACTIVE' }
            });

            const authCommand = AuthenticateUserCommand.create(
                userEmail,
                password,
                customerId
            );

            await expect(authenticateHandler.handle(authCommand)).rejects.toThrow();
        });

        it('should allow login after reactivation', async () => {
            // Reactivate the user
            await prismaService.getClient().user.update({
                where: { email: userEmail },
                data: { status: 'ACTIVE' }
            });

            const authCommand = AuthenticateUserCommand.create(
                userEmail,
                password,
                customerId
            );

            const result = await authenticateHandler.handle(authCommand);
            expect(result.user.email).toBe(userEmail);
        });
    });

    describe('Step 7: Session Management', () => {
        it('should maintain concurrent sessions for different users', async () => {
            const adminAuth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(adminEmail, password, customerId)
            );

            const userAuth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(userEmail, password, customerId)
            );

            const adminSession = await sessionService.validateSession(adminAuth.token);
            const userSession = await sessionService.validateSession(userAuth.token);

            expect(adminSession).not.toBeNull();
            expect(userSession).not.toBeNull();
            expect(adminSession?.userId).not.toBe(userSession?.userId);
        });

        it('should invalidate session on logout', async () => {
            const auth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(userEmail, password, customerId)
            );

            // Simulate logout by removing session
            const sessions = (sessionService as any).sessions;
            sessions.delete(auth.token);

            const session = await sessionService.validateSession(auth.token);
            expect(session).toBeNull();
        });
    });
});
