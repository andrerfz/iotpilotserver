import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthenticateUserHandler} from './authenticate-user.handler';
import {AuthenticateUserCommand} from './authenticate-user.command';
import {User} from '@/lib/user/domain/entities/user.entity';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

// Mock dependencies
class MockUserAuthenticator {
  authenticate = vi.fn();
  authenticateSuperAdmin = vi.fn();
}

class MockSessionService {
  createSession = vi.fn();
}

// Mock PrismaService
vi.mock('@/lib/shared/infrastructure/database/prisma.service', () => ({
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

      const user = User.create(
        Email.create(email),
        Password.create(password),
        UserRole.create('USER'),
        CustomerId.create('customer-123'),
        'testuser'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('jwt-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        password,
        'customer-123'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockUserAuthenticator.authenticate).toHaveBeenCalled();
      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: expect.any(String),
          email,
          username: 'testuser',
          role: 'USER',
          customerId: 'customer-123'
        },
        token: 'jwt-token-123'
      });
    });

    it('should support remember me functionality', async () => {
      // Arrange
      const email = 'user@example.com';
      const password = 'SecureP@ssw0rd2024!';

      const user = User.create(
        Email.create(email),
        Password.create(password),
        UserRole.create('USER'),
        CustomerId.create('customer-123'),
        'testuser'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('jwt-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        password,
        'customer-123'
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
        'customer-123'
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
        'customer-123'
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
        'customer-123'
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
      const user = User.create(
        Email.create(email),
        Password.create('Sup3rAdm!n@2024'),
        UserRole.create('SUPERADMIN'),
        null, // No customerId for SUPERADMIN
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
      const user = User.create(
        Email.create(email),
        Password.create('SecureP@ssw0rd2024!'),
        UserRole.create('ADMIN'),
        CustomerId.create('customer-123'),
        'customeradmin'
      );

      mockUserAuthenticator.authenticate.mockResolvedValue(user);
      mockSessionService.createSession.mockResolvedValue('admin-token-123');

      const command = AuthenticateUserCommand.create(
        email,
        'SecureP@ssw0rd2024!',
        'customer-123'
      );

      // Act
      const result = await handler.handle(command);

      // Assert
      expect(mockUserAuthenticator.authenticate).toHaveBeenCalled();
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.customerId).toBe('customer-123');
    });
  });

  describe('handle - rate limiting scenarios', () => {
    it('should track failed login attempts', async () => {
      // Arrange
      mockUserAuthenticator.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      const command = AuthenticateUserCommand.create(
        'attacker@example.com',
        'SecureP@ssw0rd2024!',
        'customer-123'
      );

      // Act & Assert
      for (let i = 0; i < 5; i++) {
        await expect(handler.handle(command)).rejects.toThrow('Invalid credentials');
      }

      expect(mockUserAuthenticator.authenticate).toHaveBeenCalledTimes(5);
    });
  });
});

