import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaUserRepository} from '../prisma-user.repository';
import {User} from '../../../domain/entities/user.entity';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {Email} from '../../../domain/value-objects/email.vo';
import {Username} from '../../../domain/value-objects/username.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserMapper} from '../../mappers/user.mapper';

// Mock Prisma
const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const mockTenantPrismaClient = {
  client: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
};

// @/lib/db is no longer used - repository now uses PrismaService

vi.mock('@/lib/tenant-middleware', () => ({
  tenantPrisma: mockTenantPrismaClient,
}));

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let mockUserMapper: UserMapper;
  let user: User;

  beforeEach(() => {
    mockUserMapper = {
      toDomain: vi.fn(),
      toPersistence: vi.fn(),
    } as UserMapper;

    repository = new PrismaUserRepository(mockUserMapper);

    // Create test user
    user = User.create(
      UserId.create('user-1'),
      Email.create('test@example.com'),
      Username.create('testuser'),
      CustomerId.create('customer-1')
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userId = UserId.create('user-1');
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue(userData);
      mockUserMapper.toDomain.mockReturnValue(user);

      const result = await repository.findById(userId);

      expect(result).toBe(user);
      expect(mockTenantPrismaClient.client.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId.getValue() }
      });
      expect(mockUserMapper.toDomain).toHaveBeenCalledWith(userData);
    });

    it('should return null when user not found', async () => {
      const userId = UserId.create('non-existent');

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(userId);

      expect(result).toBeNull();
      expect(mockUserMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found (bypasses tenant filtering)', async () => {
      const email = Email.create('test@example.com');
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(userData);
      mockUserMapper.toDomain.mockReturnValue(user);

      const result = await repository.findByEmail(email);

      expect(result).toBe(user);
      // Note: Uses direct prisma client, not tenantPrisma
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.getValue() }
      });
      expect(mockUserMapper.toDomain).toHaveBeenCalledWith(userData);
    });

    it('should return null when user not found', async () => {
      const email = Email.create('notfound@example.com');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail(email);

      expect(result).toBeNull();
      expect(mockUserMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findByEmailInTenant', () => {
    it('should return user when found in specific tenant', async () => {
      const email = Email.create('test@example.com');
      const customerId = CustomerId.create('customer-1');
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(userData);
      mockUserMapper.toDomain.mockReturnValue(user);

      const result = await repository.findByEmailInTenant(email, customerId);

      expect(result).toBe(user);
      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: email.getValue(),
          customerId: customerId.getValue()
        }
      });
      expect(mockUserMapper.toDomain).toHaveBeenCalledWith(userData);
    });

    it('should return null when user not found in tenant', async () => {
      const email = Email.create('test@example.com');
      const customerId = CustomerId.create('customer-1');

      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmailInTenant(email, customerId);

      expect(result).toBeNull();
      expect(mockUserMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('existsByEmail', () => {
    it('should return true when user exists', async () => {
      const email = Email.create('test@example.com');

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      });

      const result = await repository.existsByEmail(email);

      expect(result).toBe(true);
      expect(mockTenantPrismaClient.client.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.getValue() }
      });
    });

    it('should return false when user does not exist', async () => {
      const email = Email.create('notfound@example.com');

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue(null);

      const result = await repository.existsByEmail(email);

      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('should create new user when user does not exist', async () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue(null);
      mockUserMapper.toPersistence.mockReturnValue(userData);
      mockTenantPrismaClient.client.user.create.mockResolvedValue(userData);

      await repository.save(user);

      expect(mockTenantPrismaClient.client.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id.getValue() }
      });
      expect(mockUserMapper.toPersistence).toHaveBeenCalledWith(user);
      expect(mockTenantPrismaClient.client.user.create).toHaveBeenCalledWith({
        data: userData
      });
    });

    it('should update existing user', async () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockTenantPrismaClient.client.user.findUnique.mockResolvedValue(userData);
      mockUserMapper.toPersistence.mockReturnValue(userData);
      mockTenantPrismaClient.client.user.update.mockResolvedValue(userData);

      await repository.save(user);

      expect(mockTenantPrismaClient.client.user.update).toHaveBeenCalledWith({
        where: { id: user.id.getValue() },
        data: userData
      });
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = UserId.create('user-1');

      mockTenantPrismaClient.client.user.delete.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      });

      await repository.delete(userId);

      expect(mockTenantPrismaClient.client.user.delete).toHaveBeenCalledWith({
        where: { id: userId.getValue() }
      });
    });
  });

  describe('findAll', () => {
    it('should return all users with pagination', async () => {
      const usersData = [
        { id: 'user-1', email: 'test1@example.com' },
        { id: 'user-2', email: 'test2@example.com' }
      ];

      mockTenantPrismaClient.client.user.findMany.mockResolvedValue(usersData);
      mockUserMapper.toDomain.mockImplementation((data) => {
        if (data.id === 'user-1') return user;
        return User.create(
          UserId.create('user-2'),
          Email.create('test2@example.com'),
          Username.create('testuser2'),
          CustomerId.create('customer-1')
        );
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(mockTenantPrismaClient.client.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: undefined,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        customerId: CustomerId.create('customer-1'),
        isActive: true
      };

      mockTenantPrismaClient.client.user.findMany.mockResolvedValue([]);

      await repository.findAll(filters);

      expect(mockTenantPrismaClient.client.user.findMany).toHaveBeenCalledWith({
        where: {
          customerId: filters.customerId.getValue(),
          status: 'ACTIVE'
        },
        skip: 0,
        take: undefined,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('count', () => {
    it('should return user count', async () => {
      mockTenantPrismaClient.client.user.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockTenantPrismaClient.client.user.count).toHaveBeenCalledWith({
        where: {}
      });
    });

    it('should apply filters to count', async () => {
      const filters = { customerId: CustomerId.create('customer-1') };

      mockTenantPrismaClient.client.user.count.mockResolvedValue(3);

      const result = await repository.count(filters);

      expect(result).toBe(3);
      expect(mockTenantPrismaClient.client.user.count).toHaveBeenCalledWith({
        where: { customerId: filters.customerId.getValue() }
      });
    });
  });
});
