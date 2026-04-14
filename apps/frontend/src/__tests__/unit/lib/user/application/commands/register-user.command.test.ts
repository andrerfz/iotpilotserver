import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RegisterUserCommand} from '@iotpilot/core/user/application/commands/register-user/register-user.command';
import {RegisterUserHandler} from '@iotpilot/core/user/application/commands/register-user/register-user.handler';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {PasswordHasher} from '@iotpilot/core/user/domain/services/password-hasher';
import {TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';

const CUSTOMER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('RegisterUserCommand', () => {
  let registerUserHandler: RegisterUserHandler;
  let mockUserRepository: any;
  let mockPasswordHasher: PasswordHasher;
  let mockLogger: StructuredLogger;
  let tenantContext: TenantContextImpl;

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailInTenant: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findByCustomerId: vi.fn(),
    };

    mockPasswordHasher = {
      hash: vi.fn().mockResolvedValue('$2a$12$mockedBcryptHashValue'),
      verify: vi.fn().mockResolvedValue(true),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as StructuredLogger;

    const customerId = CustomerId.create(CUSTOMER_UUID);
    const userId = UserId.fromString('admin-user-123');
    const userRole = UserRole.admin();
    tenantContext = new TenantContextImpl(customerId, userId, userRole, false);

    vi.clearAllMocks();

    // Re-set mock return values after clearAllMocks
    mockPasswordHasher.hash = vi.fn().mockResolvedValue('$2a$12$mockedBcryptHashValue');
    mockPasswordHasher.verify = vi.fn().mockResolvedValue(true);

    registerUserHandler = new RegisterUserHandler(
      mockUserRepository as UserRepository,
      mockPasswordHasher,
      mockLogger
    );
  });

  it('should create a new user successfully', async () => {
    const command = new RegisterUserCommand(
      tenantContext,
      'test@example.com',
      'Kx9#mQ7$vL2@nR5!pF8',
      'John',
      'Doe',
      undefined,
      'USER'
    );

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue(undefined);

    const result = await registerUserHandler.handle(command);

    expect(result).toBeDefined();
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('should throw an error if user with email already exists', async () => {
    const command = new RegisterUserCommand(
      tenantContext,
      'existing@example.com',
      'Kx9#mQ7$vL2@nR5!pF8',
      'Jane',
      'Doe',
      undefined,
      'USER'
    );

    // When findByEmail throws or returns a user, the handler catches it
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(registerUserHandler.handle(command)).rejects.toThrow();
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should throw if tenant context has no customer ID', async () => {
    const superAdminContext = TenantContextImpl.createSuperAdmin();

    const command = new RegisterUserCommand(
      superAdminContext,
      'test@example.com',
      'Kx9#mQ7$vL2@nR5!pF8',
      'John',
      'Doe',
      undefined,
      'USER'
    );

    await expect(registerUserHandler.handle(command)).rejects.toThrow('Customer ID not found in tenant context');
  });
});
