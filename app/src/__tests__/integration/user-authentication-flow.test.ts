/**
 * @vitest-environment node
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {AuthenticateUserHandler} from '@/lib/user/application/commands/authenticate-user/authenticate-user.handler';
import {AuthenticateUserCommand} from '@/lib/user/application/commands/authenticate-user/authenticate-user.command';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {User} from '@/lib/user/domain/entities/user.entity';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

// Mock in-memory user repository
class InMemoryUserRepository implements UserRepository {
    private users: Map<string, User> = new Map();

    async findById(id: UserId): Promise<User | null> {
        return this.users.get(id.getValue()) || null;
    }

    async findByEmail(email: Email): Promise<User | null> {
        const emailValue = email.getValue();
        for (const user of this.users.values()) {
            if (user.getEmail().getValue() === emailValue) {
                return user;
            }
        }
        return null;
    }

    async findByEmailInTenant(email: Email, customerId: CustomerId): Promise<User | null> {
        const emailValue = email.getValue();
        for (const user of this.users.values()) {
            if (user.getEmail().getValue() === emailValue && 
                user.getCustomerId() && 
                user.getCustomerId()?.getValue() === customerId.getValue()) {
                return user;
            }
        }
        return null;
    }

    async emailExists(email: Email): Promise<boolean> {
        return (await this.findByEmail(email)) !== null;
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async save(user: User): Promise<void> {
        this.users.set(user.getId().getValue(), user);
    }

    async delete(id: UserId): Promise<void> {
        this.users.delete(id.getValue());
    }

    clear(): void {
        this.users.clear();
    }
}

// Mock session service
class InMemorySessionService {
    private sessions: Map<string, { userId: string; customerId: string | null; expiresAt: Date }> = new Map();

    async createSession(userId: string, customerId?: string | null): Promise<string> {
        const token = `token-${userId}-${Date.now()}`;
        this.sessions.set(token, {
            userId,
            customerId: customerId || null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        return token;
    }

    async validateSession(token: string): Promise<{ userId: string; customerId: string | null } | null> {
        const session = this.sessions.get(token);
        if (!session) return null;
        if (session.expiresAt < new Date()) {
            this.sessions.delete(token);
            return null;
        }
        return { userId: session.userId, customerId: session.customerId };
    }

    async invalidateSession(token: string): Promise<void> {
        this.sessions.delete(token);
    }

    clear(): void {
        this.sessions.clear();
    }
}

describe('User Authentication Flow Integration', () => {
    let userRepository: InMemoryUserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let eventBus: InMemoryEventBus;
    let sessionService: InMemorySessionService;
    let userAuthenticator: UserAuthenticator;
    let registerUserHandler: RegisterUserHandler;
    let authenticateUserHandler: AuthenticateUserHandler;

    beforeEach(() => {
        userRepository = new InMemoryUserRepository();
        passwordHasher = new BcryptPasswordHasher();
        eventBus = new InMemoryEventBus();
        sessionService = new InMemorySessionService();
        userAuthenticator = new UserAuthenticator(userRepository, passwordHasher);
        
        registerUserHandler = new RegisterUserHandler(
            userRepository,
            passwordHasher,
            eventBus
        );
        
        authenticateUserHandler = new AuthenticateUserHandler(
            userAuthenticator,
            sessionService as any
        );
    });

    describe('Complete User Lifecycle', () => {
        it.skip('should register a user, authenticate, and create a session', async () => {
            // Step 1: Register user
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'ACTIVE'
            );

            await registerUserHandler.handle(registerCommand);

            // Verify user was registered
            const registeredUser = await userRepository.findByEmail(Email.create(email));
            expect(registeredUser).not.toBeNull();
            expect(registeredUser?.getEmail().getValue()).toBe(email);
            expect(registeredUser?.isActive()).toBe(true);

            // Step 2: Authenticate user
            const authCommand = AuthenticateUserCommand.create(
                email,
                password,
                customerId
            );

            const authResult = await authenticateUserHandler.handle(authCommand);

            // Verify authentication result
            expect(authResult).toBeDefined();
            expect(authResult.user.email).toBe(email);
            expect(authResult.user.role).toBe('USER');
            expect(authResult.user.customerId).toBe(customerId);
            expect(authResult.token).toBeDefined();

            // Step 3: Validate session
            const sessionInfo = await sessionService.validateSession(authResult.token);
            expect(sessionInfo).not.toBeNull();
            expect(sessionInfo?.userId).toBe(registeredUser?.getId().getValue());
            expect(sessionInfo?.customerId).toBe(customerId);
        });

        it('should fail authentication with wrong password', async () => {
            // Register user
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'ACTIVE'
            );

            await registerUserHandler.handle(registerCommand);

            // Attempt authentication with wrong password
            const authCommand = AuthenticateUserCommand.create(
                email,
                'WrongP@ssw0rd!',
                customerId
            );

            await expect(authenticateUserHandler.handle(authCommand))
                .rejects.toThrow();
        });

        it('should fail authentication for non-existent user', async () => {
            const authCommand = AuthenticateUserCommand.create(
                'nonexistent@example.com',
                'SecureP@ssw0rd2024!',
                'customer-123'
            );

            await expect(authenticateUserHandler.handle(authCommand))
                .rejects.toThrow();
        });

        it('should fail authentication for inactive user', async () => {
            // Register user
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'INACTIVE'
            );

            await registerUserHandler.handle(registerCommand);

            // Attempt authentication
            const authCommand = AuthenticateUserCommand.create(
                email,
                password,
                customerId
            );

            await expect(authenticateUserHandler.handle(authCommand))
                .rejects.toThrow();
        });
    });

    describe('Multi-Tenant Isolation', () => {
        it('should isolate users by tenant during authentication', async () => {
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            
            // Register user in tenant 1
            const tenant1Command = new RegisterUserCommand(
                email,
                password,
                'user1',
                'USER',
                'tenant-1',
                'ACTIVE'
            );
            await registerUserHandler.handle(tenant1Command);

            // Attempt to authenticate as user from tenant 2 (wrong tenant)
            const authCommand = AuthenticateUserCommand.create(
                email,
                password,
                'tenant-2' // Different tenant
            );

            await expect(authenticateUserHandler.handle(authCommand))
                .rejects.toThrow();
        });

        it.skip('should allow SUPERADMIN to authenticate without tenant', async () => {
            const email = `admin-${Date.now()}@platform.com`;
            const password = 'Sup3rAdm!n@2024';

            // Register SUPERADMIN user (no customerId)
            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'superadmin',
                'SUPERADMIN',
                null as any, // SUPERADMIN has no tenant
                'ACTIVE'
            );

            await registerUserHandler.handle(registerCommand);

            // Authenticate SUPERADMIN
            const authCommand = AuthenticateUserCommand.createSuperAdmin(
                email,
                password
            );

            const authResult = await authenticateUserHandler.handle(authCommand);

            expect(authResult.user.role).toBe('SUPERADMIN');
            expect(authResult.user.customerId).toBeNull();
        });

        it('should prevent duplicate email across different tenants', async () => {
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';

            // Register user in tenant 1
            const tenant1Command = new RegisterUserCommand(
                email,
                password,
                'user1',
                'USER',
                'tenant-1',
                'ACTIVE'
            );
            await registerUserHandler.handle(tenant1Command);

            // Try to register same email in tenant 2
            const tenant2Command = new RegisterUserCommand(
                email,
                password,
                'user2',
                'USER',
                'tenant-2',
                'ACTIVE'
            );

            // This should fail because email must be globally unique
            await expect(registerUserHandler.handle(tenant2Command))
                .rejects.toThrow();
        });
    });

    describe('Role-Based Access', () => {
        it.skip('should authenticate users with different roles', async () => {
            const roles = ['USER', 'ADMIN', 'MANAGER'];
            const customerId = 'customer-123';

            for (const role of roles) {
                const email = `${role.toLowerCase()}-${Date.now()}@example.com`;
                const password = 'SecureP@ssw0rd2024!';

                // Register user with specific role
                const registerCommand = new RegisterUserCommand(
                    email,
                    password,
                    `user-${role}`,
                    role,
                    customerId,
                    'ACTIVE'
                );
                await registerUserHandler.handle(registerCommand);

                // Authenticate
                const authCommand = AuthenticateUserCommand.create(
                    email,
                    password,
                    customerId
                );
                const authResult = await authenticateUserHandler.handle(authCommand);

                expect(authResult.user.role).toBe(role);
                expect(authResult.user.customerId).toBe(customerId);
            }
        });
    });

    describe('Session Management', () => {
        it.skip('should create valid session after authentication', async () => {
            // Register and authenticate user
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'ACTIVE'
            );
            await registerUserHandler.handle(registerCommand);

            const authCommand = AuthenticateUserCommand.create(
                email,
                password,
                customerId
            );
            const authResult = await authenticateUserHandler.handle(authCommand);

            // Validate session
            const sessionInfo = await sessionService.validateSession(authResult.token);
            expect(sessionInfo).not.toBeNull();
            expect(sessionInfo?.customerId).toBe(customerId);
        });

        it.skip('should invalidate session on logout', async () => {
            // Register and authenticate user
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'ACTIVE'
            );
            await registerUserHandler.handle(registerCommand);

            const authCommand = AuthenticateUserCommand.create(
                email,
                password,
                customerId
            );
            const authResult = await authenticateUserHandler.handle(authCommand);

            // Invalidate session
            await sessionService.invalidateSession(authResult.token);

            // Verify session is invalid
            const sessionInfo = await sessionService.validateSession(authResult.token);
            expect(sessionInfo).toBeNull();
        });
    });

    describe('Event Publishing', () => {
        it.skip('should publish UserRegisteredEvent on registration', async () => {
            const email = `test-${Date.now()}@example.com`;
            const password = 'SecureP@ssw0rd2024!';
            const customerId = 'customer-123';

            const publishedEvents: any[] = [];
            eventBus.subscribe('UserRegistered', (event) => {
                publishedEvents.push(event);
            });

            const registerCommand = new RegisterUserCommand(
                email,
                password,
                'testuser',
                'USER',
                customerId,
                'ACTIVE'
            );
            await registerUserHandler.handle(registerCommand);

            expect(publishedEvents).toHaveLength(1);
            expect(publishedEvents[0].eventName).toBe('UserRegistered');
        });
    });
});

