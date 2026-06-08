import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {PrismaUserRepository} from '@iotpilot/core/user/infrastructure/repositories/prisma-user.repository';
import {UserMapper} from '@iotpilot/core/user/infrastructure/mappers/user.mapper';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {Email} from '@iotpilot/core/user/domain/value-objects/email.vo';
import {Password} from '@iotpilot/core/user/domain/value-objects/password.vo';
import {Username} from '@iotpilot/core/user/domain/value-objects/username.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {CustomerId} from '@iotpilot/core/customer/domain/value-objects/customer-id.vo';
import {UserEntity} from '@iotpilot/core/user/domain/entities/user.entity';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';

describe('User Repository Integration Tests', () => {
  let userRepository: PrismaUserRepository;
  let prismaService: PrismaService;
  let testCustomerId: CustomerId;
  let testUserId: UserId;
  let testEmail: Email;
  let testUsername: Username;
  let testPassword: Password;
  let testRole: UserRole;
  let adminContext: TenantContext;

  beforeEach(async () => {
    prismaService = new PrismaService();
    userRepository = new PrismaUserRepository(new UserMapper(), prismaService);

    // Create test data (CustomerId requires UUID or CUID; UserId accepts [a-z0-9-]+)
    testCustomerId = CustomerId.create('clr7abc1234567890xyzab123'); // CUID: c + 24+ alphanumeric
    testUserId = UserId.create('test-user-repo');
    testEmail = Email.create('testuser-repo@test.com');
    testUsername = Username.create('testuserrepo');
    testPassword = Password.create('SecurePass123!');
    testRole = UserRole.admin();

    // Create admin context for testing
    const adminUserId = UserId.create('admin-user');
    adminContext = TenantContextImpl.createSuperAdmin(adminUserId);

    // Clean up any existing test data: users for this customer first, then customer
    await prismaService.getClient().user.deleteMany({
      where: { customerId: testCustomerId.getValue() },
    });

    await prismaService.getClient().customer.deleteMany({
      where: { id: testCustomerId.getValue() },
    });

    // Create test customer (id must match CustomerId CUID)
    await prismaService.getClient().customer.create({
      data: {
        id: testCustomerId.getValue(),
        name: 'Test Customer Repo',
        slug: 'test-customer-repo',
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
      },
    });
  });

  afterEach(async () => {
    // Delete users for this customer first (some tests create extra users e.g. findByCustomerId)
    await prismaService.getClient().user.deleteMany({
      where: { customerId: testCustomerId.getValue() },
    });

    await prismaService.getClient().customer.deleteMany({
      where: { id: testCustomerId.getValue() },
    });
  });

  describe('save', () => {
    it('should save a new user successfully', async () => {
      const user = UserEntity.create(
        testUserId,
        testEmail,
        testRole,
        testCustomerId,
        { passwordHash: 'test-hash', salt: 'test-salt', failedLoginAttempts: 0, isLocked: false },
        testUsername.getValue()
      );

      await userRepository.save(user);

      // Verify user was saved
      const savedUser = await prismaService.getClient().user.findUnique({
        where: { id: testUserId.getValue() },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser?.id).toBe(testUserId.getValue());
      expect(savedUser?.email).toBe(testEmail.getValue());
      expect(savedUser?.username).toBe(testUsername.getValue());
      expect(savedUser?.role).toBe(testRole.getValue());
      expect(savedUser?.customerId).toBe(testCustomerId.getValue());
      expect(savedUser?.status).toBe('ACTIVE');
    });

    it('should update existing user', async () => {
      const user = UserEntity.create(
        testUserId,
        testEmail,
        testRole,
        testCustomerId,
        { passwordHash: 'test-hash', salt: 'test-salt', failedLoginAttempts: 0, isLocked: false },
        testUsername.getValue()
      );

      await userRepository.save(user);

      const loaded = await userRepository.findById(testUserId);
      expect(loaded).not.toBeNull();
      loaded!.username = 'updatedusername';
      await userRepository.save(loaded!);

      // Verify user was updated
      const savedUser = await prismaService.getClient().user.findUnique({
        where: { id: testUserId.getValue() },
      });

      expect(savedUser?.username).toBe('updatedusername');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      // Create user in database
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const foundUser = await userRepository.findById(testUserId);

      expect(foundUser).toBeDefined();
      expect(foundUser?.getId().getValue()).toBe(testUserId.getValue());
      expect(foundUser?.getEmail().getValue()).toBe(testEmail.getValue());
      expect(foundUser?.getUsername()).toBe(testUsername.getValue());
      expect(foundUser?.getRole().getValue()).toBe(testRole.getValue());
    });

    it('should return null for non-existent user', async () => {
      const nonExistentUserId = UserId.create('non-existent-user');
      const foundUser = await userRepository.findById(nonExistentUserId);

      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Create user in database
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const foundUser = await userRepository.findByEmail(testEmail);

      expect(foundUser).toBeDefined();
      expect(foundUser?.getId().getValue()).toBe(testUserId.getValue());
      expect(foundUser?.getEmail().getValue()).toBe(testEmail.getValue());
    });

    it('should return null for non-existent email', async () => {
      const nonExistentEmail = Email.create('nonexistent@test.com');
      const foundUser = await userRepository.findByEmail(nonExistentEmail);

      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it.skip('should find user by username', async () => {
      // Create user in database
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const foundUser = await userRepository.findByUsername(testUsername);

      expect(foundUser).toBeDefined();
      expect(foundUser?.getId().getValue()).toBe(testUserId.getValue());
      expect(foundUser?.getUsername()).toBe(testUsername.getValue());
    });

    it('should return null for non-existent username', async () => {
      const nonExistentUsername = Username.create('nonexistentuser');
      const foundUser = await userRepository.findByUsername(nonExistentUsername);

      expect(foundUser).toBeNull();
    });
  });

  describe('findByCustomerId', () => {
    it('should find all users for a customer', async () => {
      // Create multiple users for the same customer
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const secondUserId = UserId.create('test-user-repo-2');
      const secondEmail = Email.create('testuser2-repo@test.com');
      const secondUsername = Username.create('testuserrepo2');

      await prismaService.getClient().user.create({
        data: {
          id: secondUserId.getValue(),
          email: secondEmail.getValue(),
          username: secondUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const users = await userRepository.findByCustomerId(testCustomerId);

      expect(users).toHaveLength(2);
      const userIds = users.map(u => u.getId().getValue());
      expect(userIds).toContain(testUserId.getValue());
      expect(userIds).toContain(secondUserId.getValue());
    });

    it('should return empty array for customer with no users', async () => {
      const emptyCustomerId = CustomerId.create('cemptycust000000000000000001');
      const users = await userRepository.findByCustomerId(emptyCustomerId);

      expect(users).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true for existing user', async () => {
      // Create user in database
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const exists = await userRepository.exists(testUserId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const nonExistentUserId = UserId.create('non-existent-user');
      const exists = await userRepository.exists(nonExistentUserId);

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should count total users', async () => {
      const initialCount = await userRepository.count();

      // Create a user
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const finalCount = await userRepository.count();
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      // Create user in database
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      await userRepository.delete(testUserId);

      // Verify user is soft deleted
      const deletedUser = await prismaService.getClient().user.findUnique({
        where: { id: testUserId.getValue() },
      });

      expect(deletedUser?.deletedAt).toBeDefined();
      expect(deletedUser?.status).toBe('INACTIVE');
    });
  });

  describe('findAll', () => {
    it('should return all active users', async () => {
      // Create multiple users
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const secondUserId = UserId.create('test-user-repo-2');
      const secondEmail = Email.create('testuser2-repo@test.com');
      const secondUsername = Username.create('testuserrepo2');

      await prismaService.getClient().user.create({
        data: {
          id: secondUserId.getValue(),
          email: secondEmail.getValue(),
          username: secondUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      const users = await userRepository.findAll();

      expect(users.length).toBeGreaterThanOrEqual(2);
      const userIds = users.map(u => u.getId().getValue());
      expect(userIds).toContain(testUserId.getValue());
      expect(userIds).toContain(secondUserId.getValue());
    });
  });

  describe('findActive', () => {
    it('should return only active users', async () => {
      // Create active user
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      // Create inactive user
      const inactiveUserId = UserId.create('inactive-user');
      const inactiveEmail = Email.create('inactive@test.com');
      const inactiveUsername = Username.create('inactiveuser');

      await prismaService.getClient().user.create({
        data: {
          id: inactiveUserId.getValue(),
          email: inactiveEmail.getValue(),
          username: inactiveUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'INACTIVE',
        },
      });

      const activeUsers = await userRepository.findActive();

      expect(activeUsers.length).toBeGreaterThanOrEqual(1);
      const activeUserIds = activeUsers.map(u => u.getId().getValue());
      expect(activeUserIds).toContain(testUserId.getValue());
      expect(activeUserIds).not.toContain(inactiveUserId.getValue());
    });
  });

  describe('findInactive', () => {
    it('should return only inactive users', async () => {
      // Create inactive user
      const inactiveUserId = UserId.create('inactive-user');
      const inactiveEmail = Email.create('inactive@test.com');
      const inactiveUsername = Username.create('inactiveuser');

      await prismaService.getClient().user.create({
        data: {
          id: inactiveUserId.getValue(),
          email: inactiveEmail.getValue(),
          username: inactiveUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'INACTIVE',
        },
      });

      const inactiveUsers = await userRepository.findInactive();

      expect(inactiveUsers.length).toBeGreaterThanOrEqual(1);
      const inactiveUserIds = inactiveUsers.map(u => u.getId().getValue());
      expect(inactiveUserIds).toContain(inactiveUserId.getValue());
    });
  });

  describe('transaction support', () => {
    const creds = { passwordHash: 'test-hash', salt: 'test-salt', failedLoginAttempts: 0, isLocked: false };
    it('should handle transactions correctly', async () => {
      const user1 = UserEntity.create(
        testUserId,
        testEmail,
        testRole,
        testCustomerId,
        creds,
        testUsername.getValue()
      );

      const user2Id = UserId.create('test-user-repo-2');
      const user2Email = Email.create('testuser2-repo@test.com');
      const user2Username = Username.create('testuserrepo2');

      const user2 = UserEntity.create(
        user2Id,
        user2Email,
        testRole,
        testCustomerId,
        creds,
        user2Username.getValue()
      );

      // Test transaction by using prisma directly for transaction
      await prismaService.getClient().$transaction(async () => {
        await userRepository.save(user1);
        await userRepository.save(user2);
      });

      // Verify both users were saved
      const savedUser1 = await prismaService.getClient().user.findUnique({
        where: { id: testUserId.getValue() },
      });
      const savedUser2 = await prismaService.getClient().user.findUnique({
        where: { id: user2Id.getValue() },
      });

      expect(savedUser1).toBeDefined();
      expect(savedUser2).toBeDefined();
    });
  });

  describe('data integrity', () => {
    it('should maintain referential integrity with customer', async () => {
      const user = UserEntity.create(
        testUserId,
        testEmail,
        testRole,
        testCustomerId,
        { passwordHash: 'test-hash', salt: 'test-salt', failedLoginAttempts: 0, isLocked: false },
        testUsername.getValue()
      );

      await userRepository.save(user);

      const savedUser = await prismaService.getClient().user.findUnique({
        where: { id: testUserId.getValue() },
        include: { customer: true },
      });

      expect(savedUser?.customer).toBeDefined();
      expect(savedUser?.customer?.id).toBe(testCustomerId.getValue());
    });

    it('should handle unique constraint violations', async () => {
      // Create first user
      await prismaService.getClient().user.create({
        data: {
          id: testUserId.getValue(),
          email: testEmail.getValue(),
          username: testUsername.getValue(),
          password: 'hashedpassword',
          role: testRole.getValue(),
          customer: { connect: { id: testCustomerId.getValue() } },
          status: 'ACTIVE',
        },
      });

      // Try to create user with same email
      const duplicateUser = UserEntity.create(
        UserId.create('different-id'),
        testEmail, // Same email
        testRole,
        testCustomerId,
        { passwordHash: 'test-hash', salt: 'test-salt', failedLoginAttempts: 0, isLocked: false },
        'differentusername'
      );

      await expect(userRepository.save(duplicateUser)).rejects.toThrow();
    });
  });
});
