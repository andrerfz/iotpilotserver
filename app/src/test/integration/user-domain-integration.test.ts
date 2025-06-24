import {describe, it, expect, beforeEach, vi} from 'vitest';
import {BcryptPasswordHasher} from '@/lib/user/infrastructure/services/bcrypt-password-hasher';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {User} from '@/lib/user/domain/entities/user.entity';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';

// Mock repository to avoid database constraints
class MockUserRepository implements UserRepository {
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

    async findByEmailInTenant(email: Email, customerId: any): Promise<User | null> {
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
}

describe('User Domain Integration', () => {
    let userRepository: UserRepository;
    let passwordHasher: BcryptPasswordHasher;
    let eventBus: InMemoryEventBus;
    let registerUserHandler: RegisterUserHandler;

    beforeEach(() => {
        userRepository = new MockUserRepository();
        passwordHasher = new BcryptPasswordHasher();
        eventBus = new InMemoryEventBus();
        registerUserHandler = new RegisterUserHandler(
            userRepository,
            passwordHasher,
            eventBus
        );
    });

    it('should register a new user', async () => {
        const email = `test-${Date.now()}@example.com`;
        const customerId = 'test-customer-id';
        const command = RegisterUserCommand.createForTenant(
            email,
            'Password123!',
            customerId,
            'USER'
        );

        await registerUserHandler.handle(command);

        const user = await userRepository.findByEmail(Email.create(email));
        expect(user).not.toBeNull();
        expect(user?.getEmail().getValue()).toBe(email);
        expect(user?.getRole().getValue()).toBe('USER');
        expect(user?.isActive()).toBe(true);
        expect(user?.getCustomerId()?.getValue()).toBe(customerId);
    });
});
