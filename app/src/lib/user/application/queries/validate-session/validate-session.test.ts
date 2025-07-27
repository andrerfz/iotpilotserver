import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ValidateSessionQuery} from './validate-session.query';
import {ValidateSessionHandler} from './validate-session.handler';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {User} from '@/lib/user/domain/entities/user.entity';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

describe('ValidateSessionQuery', () => {
  describe('create', () => {
    it('should create a valid query with token', () => {
      const token = 'valid-token-123';
      const query = ValidateSessionQuery.create(token);

      expect(query.token).toBe(token);
    });

    it('should throw error when token is empty', () => {
      expect(() => ValidateSessionQuery.create('')).toThrow('Token is required for session validation');
    });

    it('should throw error when token is null', () => {
      expect(() => ValidateSessionQuery.create(null as any)).toThrow('Token is required for session validation');
    });
  });
});

describe('ValidateSessionHandler', () => {
  let handler: ValidateSessionHandler;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockSessionRepository = {
      findByToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    } as any;

    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailInTenant: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn()
    } as any;

    handler = new ValidateSessionHandler(mockSessionRepository, mockUserRepository);
  });

  describe('handle', () => {
    it('should return valid session result when session and user are valid', async () => {
      const token = 'valid-token-123';
      const query = ValidateSessionQuery.create(token);

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        token,
        getExpiresAt: function() { return this.expiresAt; },
        isExpired: function() { return new Date() > this.expiresAt; },
        getUserId: function() { return this.userId; },
        getId: function() { return { getValue: function() { return this.id; }.bind(this) }; }
      };

      const mockUser = User.create(
        Email.create('test@example.com'),
        Password.create('SecureP@ssw0rd2024!'),
        UserRole.create('USER'),
        CustomerId.create('customer-123'),
        'testuser'
      );
      // Override the generated ID to match the expected ID in the test
      Object.defineProperty(mockUser, '_entityId', {
        value: { value: 'user-123', getValue: function() { return this.value; } }
      });

      mockSessionRepository.findByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await handler.handle(query);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER',
        customerId: 'customer-123'
      });
      expect(result.session).toEqual({
        id: 'session-123',
        expiresAt: mockSession.expiresAt
      });
    });

    it('should return invalid result when session not found', async () => {
      const token = 'invalid-token';
      const query = ValidateSessionQuery.create(token);

      mockSessionRepository.findByToken.mockResolvedValue(null);

      const result = await handler.handle(query);

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should return invalid result when session is expired', async () => {
      const token = 'expired-token';
      const query = ValidateSessionQuery.create(token);

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        token,
        getExpiresAt: function() { return this.expiresAt; },
        isExpired: function() { return new Date() > this.expiresAt; },
        getUserId: function() { return this.userId; },
        getId: function() { return { getValue: function() { return this.id; }.bind(this) }; }
      };

      mockSessionRepository.findByToken.mockResolvedValue(mockSession);

      const result = await handler.handle(query);

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should return invalid result when user not found', async () => {
      const token = 'valid-token-123';
      const query = ValidateSessionQuery.create(token);

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000),
        token
      };

      mockSessionRepository.findByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await handler.handle(query);

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should return invalid result when user is deleted', async () => {
      const token = 'valid-token-123';
      const query = ValidateSessionQuery.create(token);

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000),
        token
      };

      const mockUser = User.create(
        Email.create('test@example.com'),
        Password.create('SecureP@ssw0rd2024!'),
        UserRole.create('USER'),
        CustomerId.create('customer-123'),
        'testuser'
      );
      mockUser.deletedAt = new Date(); // Mark user as deleted

      mockSessionRepository.findByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await handler.handle(query);

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const token = 'valid-token-123';
      const query = ValidateSessionQuery.create(token);

      mockSessionRepository.findByToken.mockRejectedValue(new Error('Database error'));

      const result = await handler.handle(query);

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });
  });
});