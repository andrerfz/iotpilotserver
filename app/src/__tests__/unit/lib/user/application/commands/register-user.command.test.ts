import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {UserRepository} from '@/lib/user/domain/interfaces/user.repository.interface';
import {PasswordHasher} from '@/lib/user/domain/interfaces/password-hasher.interface';
import {EventBus} from '@/lib/shared/application/bus/event-bus';
import {User} from '@/lib/user/domain/entities/user.entity';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {Username} from '@/lib/user/domain/value-objects/username.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';

// Mock dependencies
const mockUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByEmailInTenant: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  findByCustomerId: vi.fn(),
} as UserRepository;

const mockPasswordHasher = {
  hash: vi.fn(),
  compare: vi.fn(),
} as PasswordHasher;

const mockEventBus = {
  publish: vi.fn(),
  publishAll: vi.fn(),
} as EventBus;

describe('RegisterUserCommand', () => {
  let registerUserHandler: RegisterUserHandler;

  beforeEach(() => {
    registerUserHandler = new RegisterUserHandler(mockUserRepository, mockPasswordHasher, mockEventBus);
    vi.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'Kx9#mQ7$vL2@nR5!pF8';
    const username = 'testuser';
    const role = 'USER';
    const customerId = 'customer_123';
    const status = 'PENDING';

    const command = new RegisterUserCommand(email, password, username, role, customerId, status);

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.findByEmailInTenant.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue('hashedPassword');
    mockUserRepository.save.mockResolvedValue();
    mockEventBus.publishAll.mockResolvedValue();

    // Act
    const result = await registerUserHandler.handle(command);

    // Assert
    expect(mockUserRepository.findByEmail).toHaveBeenCalled();
    expect(mockUserRepository.findByEmailInTenant).toHaveBeenCalled();
    expect(mockPasswordHasher.hash).toHaveBeenCalled();
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publishAll).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should throw an error if user with email already exists globally', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'Kx9#mQ7$vL2@nR5!pF8';
    const username = 'testuser';
    const role = 'USER';
    const customerId = 'customer_123';
    const status = 'PENDING';

    const command = new RegisterUserCommand(email, password, username, role, customerId, status);

    const existingUser = new User(
      UserId.create(),
      Email.create(email),
      Username.create(username),
      Password.createHashed('hashedPassword'),
      new UserRole(UserRoleEnum[role as keyof typeof UserRoleEnum] || UserRoleEnum.USER),
      customerId ? new CustomerId(customerId) : null,
      new Date(),
      new Date(),
      null,
      status,
      false
    );

    mockUserRepository.findByEmail.mockResolvedValue(existingUser);

    // Act & Assert
    await expect(registerUserHandler.handle(command)).rejects.toThrow('User with this email already exists');
    expect(mockUserRepository.findByEmail).toHaveBeenCalled();
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should throw an error if user with email already exists in tenant', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'Kx9#mQ7$vL2@nR5!pF8';
    const username = 'testuser';
    const role = 'USER';
    const customerId = 'customer_123';
    const status = 'PENDING';

    const command = new RegisterUserCommand(email, password, username, role, customerId, status);

    const existingUser = new User(
      UserId.create(),
      Email.create(email),
      Username.create(username),
      Password.createHashed('hashedPassword'),
      new UserRole(UserRoleEnum[role as keyof typeof UserRoleEnum] || UserRoleEnum.USER),
      customerId ? new CustomerId(customerId) : null,
      new Date(),
      new Date(),
      null,
      status,
      false
    );

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.findByEmailInTenant.mockResolvedValue(existingUser);

    // Act & Assert
    await expect(registerUserHandler.handle(command)).rejects.toThrow('User with this email already exists');
    expect(mockUserRepository.findByEmail).toHaveBeenCalled();
    expect(mockUserRepository.findByEmailInTenant).toHaveBeenCalled();
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });
});
