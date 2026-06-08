import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaUserRepository} from '../prisma-user.repository';
import {UserEntity as User} from '../../../domain/entities/user.entity';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {Email} from '../../../domain/value-objects/email.vo';
import {Username} from '../../../domain/value-objects/username.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
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

vi.mock('@iotpilot/core/tenant-middleware', () => ({
  tenantPrisma: mockTenantPrismaClient,
}));

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let mockUserMapper: UserMapper;
  let mockPrismaService: any;
  let user: User;

  beforeEach(() => {
    mockUserMapper = {
      toDomain: vi.fn(),
      toPersistence: vi.fn(),
    } as UserMapper;

    mockPrismaService = {
      getClient: vi.fn().mockReturnValue(mockPrismaClient),
    };

    repository = new PrismaUserRepository(mockUserMapper, mockPrismaService);

    // Create test user
    // User.create(id, email, role, customerId?, credentials?, username?)
    user = User.create(
      UserId.create('user-1'),
      Email.create('test@example.com'),
      UserRole.create('USER'),
      CustomerId.create('ccustomer100000000000000001'),
      undefined, // credentials
      'testuser' // username
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

      mockPrismaClient.user.findUnique.mockResolvedValue(userData);
      mockUserMapper.toDomain.mockReturnValue(user);

      const result = await repository.findById(userId);

      expect(result).toBe(user);
      expect(mockPrismaService.getClient).toHaveBeenCalled();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId.getValue() }
      });
      expect(mockUserMapper.toDomain).toHaveBeenCalledWith(userData);
    });

    it('should return null when user not found', async () => {
      const userId = UserId.create('non-existent');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

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
      const customerId = CustomerId.create('ccustomer100000000000000001');
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
      const customerId = CustomerId.create('ccustomer100000000000000001');

      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmailInTenant(email, customerId);

      expect(result).toBeNull();
      expect(mockUserMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('existsByEmail', () => {
    it('should return true when user exists', async () => {
      const email = Email.create('test@example.com');

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      });

      const result = await repository.existsByEmail(email);

      expect(result).toBe(true);
      expect(mockPrismaService.getClient).toHaveBeenCalled();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.getValue() }
      });
    });

    it('should return false when user does not exist', async () => {
      const email = Email.create('notfound@example.com');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

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

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockUserMapper.toPersistence.mockReturnValue(userData);
      mockPrismaClient.user.create.mockResolvedValue(userData);

      await repository.save(user);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id.getValue() }
      });
      expect(mockUserMapper.toPersistence).toHaveBeenCalledWith(user);
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
      const createCall = mockPrismaClient.user.create.mock.calls[0][0];
      expect(createCall.data.id).toBe(userData.id);
      expect(createCall.data.email).toBe(userData.email);
      expect(createCall.data.customer.connect.id).toBe('ccustomer100000000000000001');
    });

    it('should update existing user', async () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        customerId: 'customer-1',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(userData);
      mockUserMapper.toPersistence.mockReturnValue(userData);
      mockPrismaClient.user.update.mockResolvedValue(userData);

      await repository.save(user);

      expect(mockPrismaClient.user.update).toHaveBeenCalled();
      const updateCall = mockPrismaClient.user.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe(user.id.getValue());
      expect(updateCall.data.email).toBe(userData.email);
      expect(updateCall.data.username).toBe(userData.username);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = UserId.create('user-1');

      mockPrismaClient.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        deletedAt: new Date(),
        status: 'INACTIVE'
      });

      await repository.delete(userId);

      expect(mockPrismaService.getClient).toHaveBeenCalled();
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId.getValue() },
        data: { deletedAt: expect.any(Date), status: 'INACTIVE' }
      });
    });
  });

  describe('findAll', () => {
    it('should return all users with pagination', async () => {
      const usersData = [
        { id: 'user-1', email: 'test1@example.com' },
        { id: 'user-2', email: 'test2@example.com' }
      ];

      mockPrismaClient.user.findMany.mockResolvedValue(usersData);
      mockUserMapper.toDomain.mockImplementation((data) => {
        if (data.id === 'user-1') return user;
        return User.create(
          UserId.create('user-2'),
          Email.create('test2@example.com'),
          Username.create('testuser2'),
          CustomerId.create('ccustomer100000000000000001')
        );
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.getClient).toHaveBeenCalled();
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith();
    });

    it.skip('should apply filters correctly', async () => {
      // Skipped: findAll() doesn't accept filters - use findManyWithFilters() instead
      const filters = {
        customerId: CustomerId.create('ccustomer100000000000000001'),
        isActive: true
      };

      mockPrismaClient.user.findMany.mockResolvedValue([]);

      await repository.findAll();

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith();
    });
  });

  describe('count', () => {
    it('should return user count', async () => {
      mockPrismaClient.user.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaService.getClient).toHaveBeenCalled();
      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({ where: {} });
    });

    it.skip('should apply filters to count', async () => {
      // Skipped: count() accepts TenantContext, not filters object
      const filters = { customerId: CustomerId.create('ccustomer100000000000000001') };

      mockPrismaClient.user.count.mockResolvedValue(3);

      const result = await repository.count();

      expect(result).toBe(3);
    });
  });
});
