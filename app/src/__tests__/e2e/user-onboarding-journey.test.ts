/**
 * E2E Test: User Onboarding Journey
 * 
 * This test validates the complete user onboarding flow:
 * 1. Customer signs up
 * 2. Admin user is created
 * 3. Admin logs in
 * 4. Admin creates additional team members
 * 5. Team members can access their tenant's resources
 * 
 * @vitest-environment node
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {AuthenticateUserHandler} from '@/lib/user/application/commands/authenticate-user/authenticate-user.handler';
import {AuthenticateUserCommand} from '@/lib/user/application/commands/authenticate-user/authenticate-user.command';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {PrismaUserRepository} from '@/lib/user/infrastructure/repositories/prisma-user.repository';
import {UserMapper} from '@/lib/user/infrastructure/mappers/user.mapper';
import {InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';

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

describe.skip('E2E: User Onboarding Journey', () => {
    let prismaService: PrismaService;
    let userRepository: PrismaUserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let eventBus: InMemoryEventBus;
    let sessionService: TestSessionService;
    let userAuthenticator: UserAuthenticator;
    let registerHandler: RegisterUserHandler;
    let authenticateHandler: AuthenticateUserHandler;

    // Test data
    const customerEmail = `ceo-${Date.now()}@company.com`;
    const managerEmail = `manager-${Date.now()}@company.com`;
    const userEmail = `user-${Date.now()}@company.com`;
    const password = 'SecureP@ssw0rd2024!';
    let customerId: string;
    let adminToken: string;

    beforeAll(async () => {
        // Initialize services
        prismaService = new PrismaService();
        userRepository = new PrismaUserRepository(new UserMapper(), prismaService);
        passwordHasher = new BcryptPasswordHasher();
        eventBus = new InMemoryEventBus();
        sessionService = new TestSessionService();
        userAuthenticator = new UserAuthenticator(userRepository, passwordHasher);
        
        registerHandler = new RegisterUserHandler(
            userRepository,
            passwordHasher,
            eventBus
        );
        
        authenticateHandler = new AuthenticateUserHandler(
            userAuthenticator,
            sessionService as any
        );

        // Create customer in database for this test
        const timestamp = Date.now();
        const customer = await prismaService.getClient().customer.create({
            data: {
                name: `E2E Test Company ${timestamp}`,
                slug: `e2e-test-company-${timestamp}`,
                status: 'ACTIVE'
            }
        });
        customerId = customer.id;
    });

    afterAll(async () => {
        // Cleanup: Delete test users and customer
        await prismaService.getClient().user.deleteMany({
            where: {
                OR: [
                    { email: customerEmail },
                    { email: managerEmail },
                    { email: userEmail }
                ]
            }
        });
        
        await prismaService.getClient().customer.delete({
            where: { id: customerId }
        }).catch(() => {}); // Ignore if already deleted
        
        sessionService.clear();
    });

    describe('Step 1: Company Admin Registration', () => {
        it('should register company admin (ADMIN)', async () => {
            const command = new RegisterUserCommand(
                customerEmail,
                password,
                'admin',
                'ADMIN',
                customerId,
                'ACTIVE'
            );

            await registerHandler.handle(command);

            // Verify user exists in database
            const user = await prismaService.getClient().user.findUnique({
                where: { email: customerEmail }
            });

            expect(user).not.toBeNull();
            expect(user?.email).toBe(customerEmail);
            expect(user?.role).toBe('ADMIN');
            expect(user?.customerId).toBe(customerId);
            expect(user?.status).toBe('ACTIVE');
        });
    });

    describe('Step 2: Admin Authentication', () => {
        it('should authenticate admin and receive token', async () => {
            const authCommand = AuthenticateUserCommand.create(
                customerEmail,
                password,
                customerId
            );

            const result = await authenticateHandler.handle(authCommand);

            expect(result).toBeDefined();
            expect(result.user.email).toBe(customerEmail);
            expect(result.user.role).toBe('ADMIN');
            expect(result.token).toBeDefined();

            adminToken = result.token;

            // Verify session is valid
            const session = await sessionService.validateSession(adminToken);
            expect(session).not.toBeNull();
            expect(session?.customerId).toBe(customerId);
        });

        it('should update last login timestamp', async () => {
            const user = await prismaService.getClient().user.findUnique({
                where: { email: customerEmail }
            });

            expect(user?.lastLoginAt).not.toBeNull();
        });
    });

    describe('Step 3: Admin Creates Team Members', () => {
        it('should create a manager user', async () => {
            // Admin creates a manager
            const command = new RegisterUserCommand(
                managerEmail,
                password,
                'manager',
                'MANAGER',
                customerId,
                'ACTIVE'
            );

            await registerHandler.handle(command);

            const user = await prismaService.getClient().user.findUnique({
                where: { email: managerEmail }
            });

            expect(user).not.toBeNull();
            expect(user?.role).toBe('MANAGER');
            expect(user?.customerId).toBe(customerId);
        });

        it('should create a regular user', async () => {
            const command = new RegisterUserCommand(
                userEmail,
                password,
                'user',
                'USER',
                customerId,
                'ACTIVE'
            );

            await registerHandler.handle(command);

            const user = await prismaService.getClient().user.findUnique({
                where: { email: userEmail }
            });

            expect(user).not.toBeNull();
            expect(user?.role).toBe('USER');
            expect(user?.customerId).toBe(customerId);
        });
    });

    describe('Step 4: Team Member Authentication', () => {
        it('should authenticate manager', async () => {
            const authCommand = AuthenticateUserCommand.create(
                managerEmail,
                password,
                customerId
            );

            const result = await authenticateHandler.handle(authCommand);

            expect(result.user.email).toBe(managerEmail);
            expect(result.user.role).toBe('MANAGER');
            expect(result.user.customerId).toBe(customerId);
        });

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
    });

    describe('Step 5: Verify Team Isolation', () => {
        it('should list all team members for this customer', async () => {
            const users = await prismaService.getClient().user.findMany({
                where: { customerId }
            });

            expect(users).toHaveLength(3);
            
            const roles = users.map(u => u.role).sort();
            expect(roles).toEqual(['ADMIN', 'MANAGER', 'USER']);
        });

        it('should not allow authentication with wrong tenant', async () => {
            // Try to authenticate user with wrong tenant
            const wrongTenantCommand = AuthenticateUserCommand.create(
                userEmail,
                password,
                'wrong-tenant-id'
            );

            await expect(authenticateHandler.handle(wrongTenantCommand))
                .rejects.toThrow();
        });
    });

    describe('Step 6: User Management Operations', () => {
        it('should allow admin to deactivate a user', async () => {
            // Find the user
            const user = await prismaService.getClient().user.findUnique({
                where: { email: userEmail }
            });

            expect(user).not.toBeNull();

            // Deactivate user
            await prismaService.getClient().user.update({
                where: { id: user!.id },
                data: { status: 'INACTIVE' }
            });

            // Verify user cannot login when inactive
            const authCommand = AuthenticateUserCommand.create(
                userEmail,
                password,
                customerId
            );

            await expect(authenticateHandler.handle(authCommand))
                .rejects.toThrow();
        });

        it('should allow admin to reactivate a user', async () => {
            // Reactivate user
            await prismaService.getClient().user.update({
                where: { email: userEmail },
                data: { status: 'ACTIVE' }
            });

            // User should be able to login again
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
        it('should maintain multiple concurrent sessions', async () => {
            // Login admin
            const adminAuth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(customerEmail, password, customerId)
            );

            // Login manager
            const managerAuth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(managerEmail, password, customerId)
            );

            // Both sessions should be valid
            const adminSession = await sessionService.validateSession(adminAuth.token);
            const managerSession = await sessionService.validateSession(managerAuth.token);

            expect(adminSession).not.toBeNull();
            expect(managerSession).not.toBeNull();
            expect(adminSession?.userId).not.toBe(managerSession?.userId);
        });

        it('should invalidate session on logout', async () => {
            const auth = await authenticateHandler.handle(
                AuthenticateUserCommand.create(userEmail, password, customerId)
            );

            // Simulate logout by clearing session
            const sessions = (sessionService as any).sessions;
            sessions.delete(auth.token);

            // Session should no longer be valid
            const session = await sessionService.validateSession(auth.token);
            expect(session).toBeNull();
        });
    });
});

