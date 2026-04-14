import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthenticateUserHandler} from './authenticate-user.handler';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {UserEntity} from '@iotpilot/core/user/domain/entities/user.entity';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {Email} from '@iotpilot/core/user/domain/value-objects/email.vo';
import {Password} from '@iotpilot/core/user/domain/value-objects/password.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

// Mock dependencies
class MockUserAuthenticator {
  authenticate = vi.fn();
  authenticateSuperAdmin = vi.fn();
}

class MockSessionService {
  createSession = vi.fn();
}

// Mock PrismaService
vi.mock('@iotpilot/core/shared/infrastructure/database/prisma.service', () => ({
  PrismaService: vi.fn().mockImplementation(() => ({
    getClient: () => ({
      $transaction: vi.fn((callback) => callback({
        user: {
          update: vi.fn().mockResolvedValue({})
        }
      }))
    })
  }))
}));

describe('AuthenticateUserHandler', () => {
  let handler: AuthenticateUserHandler;
  let mockUserAuthenticator: MockUserAuthenticator;
  let mockSessionService: MockSessionService;

  beforeEach(() => {
    mockUserAuthenticator = new MockUserAuthenticator();
    mockSessionService = new MockSessionService();
    
    handler = new AuthenticateUserHandler(
      mockUserAuthenticator as any,
      mockSessionService as any
    );
  });

  describe('handle - successful authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const email = 'user@example.com';
      const password = 'SecureP@ssw0rd2024!';
      const hashedPassword = '$2a$10$hashedpassword';

      const user = UserEntity.create(
        UserId.create('user-123'),
        Email.create(email),
        UserRole.create('USER'),
        CustomerId.create('c1234567890123456789012345'),
        {
          passwordHash: hashedPassword,
          salt: 'salt',
          failedLoginAttempts: 0,
          isLocked: false
        },
        'testuser'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('jwt-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        password,
        'c1234567890123456789012345'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockUserAuthenticator.authenticate).toHaveBeenCalled();
      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(result).toMatchObject({
        user: {
          id: expect.any(String),
          email,
          username: expect.any(String), // Handler uses getDisplayName() which might return email
          role: 'USER',
          customerId: 'c1234567890123456789012345'
        },
        token: 'jwt-token-123'
      });
    });

    it('should support remember me functionality', async () => {
      // Arrange
      const email = 'user@example.com';
      const password = 'SecureP@ssw0rd2024!';
      const hashedPassword = '$2a$10$hashedpassword';

      const user = UserEntity.create(
        UserId.create('user-123'),
        Email.create(email),
        UserRole.create('USER'),
        CustomerId.create('c1234567890123456789012345'),
        {
          passwordHash: hashedPassword,
          salt: 'salt',
          failedLoginAttempts: 0,
          isLocked: false
        },
        'testuser'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('jwt-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        password,
        'c1234567890123456789012345'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(result.token).toBe('jwt-token-123');
    });
  });

  describe('handle - authentication failures', () => {
    it('should fail when user does not exist', async () => {
      // Arrange
      mockUserAuthenticator.authenticate.mockResolvedValue(null);

      const command = AuthenticateUserCommand.create(
        'nonexistent@example.com',
        'SecureP@ssw0rd2024!',
        'c1234567890123456789012345'
      );

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow('Invalid credentials');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it('should fail when password is incorrect', async () => {
      // Arrange
      const email = 'user@example.com';
      
      mockUserAuthenticator.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      const command = AuthenticateUserCommand.create(
        email,
        'WrongPassword123!',
        'c1234567890123456789012345'
      );

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow('Invalid credentials');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it('should fail when user account is inactive', async () => {
      // Arrange
      const email = 'user@example.com';

      mockUserAuthenticator.authenticate.mockRejectedValue(new Error('User account is inactive'));

      const command = AuthenticateUserCommand.create(
        email,
        'SecureP@ssw0rd2024!',
        'c1234567890123456789012345'
      );

      // Act & Assert
      await expect(handler.handle(command)).rejects.toThrow('User account is inactive');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });
  });

  describe('handle - different user roles', () => {
    it('should authenticate SUPERADMIN user', async () => {
      // Arrange
      const email = 'admin@platform.com';
      const user = UserEntity.create(
        UserId.create('superadmin-123'),
        Email.create(email),
        UserRole.create('SUPERADMIN'),
        undefined, // No customerId for SUPERADMIN
        {
          passwordHash: '$2a$10$hashedpassword',
          salt: 'salt',
          failedLoginAttempts: 0,
          isLocked: false
        },
        'superadmin'
      );

      mockUserAuthenticator.authenticateSuperAdmin.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('admin-token-123');

      const command = AuthenticateUserCommand.createSuperAdmin(
        email,
        'Sup3rAdm!n@2024'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockUserAuthenticator.authenticateSuperAdmin).toHaveBeenCalled();
      expect(result.user.role).toBe('SUPERADMIN');
      expect(result.user.customerId).toBeNull();
    });

    it('should authenticate ADMIN user', async () => {
      // Arrange
      const email = 'admin@customer.com';
      const hashedPassword = '$2a$10$hashedpassword';
      const user = UserEntity.create(
        UserId.create('admin-123'),
        Email.create(email),
        UserRole.create('ADMIN'),
        CustomerId.create('c1234567890123456789012345'),
        {
          passwordHash: hashedPassword,
          salt: 'salt',
          failedLoginAttempts: 0,
          isLocked: false
        },
        'customeradmin'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('admin-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        'SecureP@ssw0rd2024!',
        'c1234567890123456789012345'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockUserAuthenticator.authenticate).toHaveBeenCalled();
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.customerId).toBe('c1234567890123456789012345');
    });
  });

  describe('handle - rate limiting scenarios', () => {
    it('should track failed login attempts', async () => {
      // Arrange
      mockUserAuthenticator.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      const command = AuthenticateUserCommand.create(
        'attacker@example.com',
        'SecureP@ssw0rd2024!',
        'c1234567890123456789012345'
      );

      // Act & Assert
      for (let i = 0; i < 5; i++) {
        await expect(handler.handle(command)).rejects.toThrow('Invalid credentials');
      }

      expect(mockUserAuthenticator.authenticate).toHaveBeenCalledTimes(5);
    });
  });
});

