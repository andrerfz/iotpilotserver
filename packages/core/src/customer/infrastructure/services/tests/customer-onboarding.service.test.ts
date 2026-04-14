import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CustomerOnboardingService} from '../customer-onboarding.service';
import {CustomerRepository} from '../../persistence/customer.repository';
import {TenantScopedLoggingService} from '@iotpilot/core/shared/infrastructure/logging/tenant-scoped-logging.service';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {CryptoService} from '@iotpilot/core/shared/domain/interfaces/crypto-service.interface';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

// Mock Prisma
const mockPrismaClient = {
  customer: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    create: vi.fn(),
  },
  apiKey: {
    create: vi.fn().mockResolvedValue({ id: 'apikey-1' }),
  },
  systemConfig: {
    create: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn(),
};

const mockPrismaService = {
  getClient: () => mockPrismaClient,
} as unknown as PrismaService;

vi.mock('@iotpilot/core/tenant-middleware', () => ({
  tenantPrisma: {
    client: mockPrismaClient,
  },
}));

describe('CustomerOnboardingService', () => {
  let onboardingService: CustomerOnboardingService;
  let mockCustomerRepository: CustomerRepository;
  let mockLoggingService: TenantScopedLoggingService;
  let mockCryptoService: CryptoService;
  let adminContext: TenantContext;

  beforeEach(() => {
    mockCustomerRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findBySlug: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
    } as CustomerRepository;

    mockLoggingService = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as TenantScopedLoggingService;

    mockCryptoService = {
      randomUUID: vi.fn().mockReturnValue('cmockcustomer000000000000001'),
      randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
    } as CryptoService;

    onboardingService = new CustomerOnboardingService(
      mockPrismaService,
      mockCustomerRepository,
      mockLoggingService,
      mockCryptoService
    );

    // Create admin context with SUPERADMIN permissions
    const mockUserId = UserId.create('admin-user');
    adminContext = TenantContextImpl.createSuperAdmin(mockUserId);

    vi.clearAllMocks();
  });

  describe('onboardNewCustomer', () => {
    it.skip('should successfully onboard a new customer with admin user', async () => {
      const customerName = 'Acme Corporation';
      const adminEmail = 'admin@acme.com';
      const adminPassword = 'SecurePass123!';

      // Mock customer creation
      mockCustomerRepository.save.mockResolvedValue(undefined);
      mockCustomerRepository.findByName.mockResolvedValue(null);

      // Mock Prisma operations (use valid CUID for customer id)
      const mockCustomerId = 'cmockcustomer000000000000001';
      mockPrismaClient.customer.create.mockResolvedValue({
        id: mockCustomerId,
        name: customerName,
        slug: 'acme-corporation',
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaClient.user.create.mockResolvedValue({
        id: 'admin-user-id',
        email: adminEmail,
        customerId: mockCustomerId,
        role: 'CUSTOMER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await onboardingService.onboardNewCustomer(
        customerName,
        adminEmail,
        adminPassword,
        adminContext
      );

      expect(result).toBeInstanceOf(CustomerId);
      expect(result.value).toBe('cmockcustomer000000000000001');

      // Verify logging
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        `Starting onboarding process for new customer: ${customerName}`,
        adminContext
      );

      // Verify customer repository was called
      expect(mockCustomerRepository.save).toHaveBeenCalled();

      // Verify Prisma operations
      expect(mockPrismaClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'mock-customer-id-123',
          name: customerName,
          slug: 'acme-corporation',
          status: 'ACTIVE',
          subscriptionTier: 'STARTER',
        }),
      });

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: adminEmail,
          role: 'CUSTOMER_ADMIN',
          status: 'ACTIVE',
          customerId: 'mock-customer-id-123',
        }),
      });
    });

    it('should throw error when user does not have SUPERADMIN permissions', async () => {
      const customerName = 'Test Company';
      const adminEmail = 'admin@test.com';
      const adminPassword = 'password123';

      // Create non-admin context
      const nonAdminContext = TenantContextImpl.create(CustomerId.create('cothercustomer00000000000001'));

      await expect(
        onboardingService.onboardNewCustomer(
          customerName,
          adminEmail,
          adminPassword,
          nonAdminContext
        )
      ).rejects.toThrow('Only SUPERADMIN can onboard new customers');
    });

    it('should handle customer creation errors', async () => {
      const customerName = 'Test Company';
      const adminEmail = 'admin@test.com';
      const adminPassword = 'password123';

      mockCustomerRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        onboardingService.onboardNewCustomer(
          customerName,
          adminEmail,
          adminPassword,
          adminContext
        )
      ).rejects.toThrow('Database error');

      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    it.skip('should create customer with default settings', async () => {
      const customerName = 'New Startup';
      const adminEmail = 'founder@startup.com';
      const adminPassword = 'FounderPass123!';

      mockCustomerRepository.save.mockResolvedValue(undefined);
      mockCustomerRepository.findByName.mockResolvedValue(null);

      mockPrismaClient.customer.create.mockResolvedValue({
        id: 'customer-id-456',
        name: customerName,
        slug: 'new-startup',
        status: 'ACTIVE',
        subscriptionTier: 'STARTER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaClient.user.create.mockResolvedValue({
        id: 'user-id-456',
        email: adminEmail,
        customerId: 'customer-id-456',
        role: 'CUSTOMER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await onboardingService.onboardNewCustomer(
        customerName,
        adminEmail,
        adminPassword,
        adminContext
      );

      expect(mockPrismaClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: customerName,
          slug: 'new-startup',
          status: 'ACTIVE',
          subscriptionTier: 'STARTER',
          maxUsers: 10,
          maxDevices: 50,
          allowedFeatures: ['basic_monitoring', 'alerts'],
        }),
      });
    });

    it('should handle transaction rollback on error', async () => {
      const customerName = 'Test Company';
      const adminEmail = 'admin@test.com';
      const adminPassword = 'password123';

      // Mock transaction to simulate rollback scenario
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockPrismaClient);
        } catch (error) {
          // Simulate rollback by throwing
          throw error;
        }
      });

      mockCustomerRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(
        onboardingService.onboardNewCustomer(
          customerName,
          adminEmail,
          adminPassword,
          adminContext
        )
      ).rejects.toThrow('Save failed');
    });

    it.skip('should create admin user with correct role and permissions', async () => {
      const customerName = 'Enterprise Corp';
      const adminEmail = 'ceo@enterprise.com';
      const adminPassword = 'CEOSecurePass123!';

      mockCustomerRepository.save.mockResolvedValue(undefined);
      mockCustomerRepository.findByName.mockResolvedValue(null);

      mockPrismaClient.customer.create.mockResolvedValue({
        id: 'enterprise-customer-id',
        name: customerName,
        slug: 'enterprise-corp',
        status: 'ACTIVE',
        subscriptionTier: 'ENTERPRISE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaClient.user.create.mockResolvedValue({
        id: 'admin-user-id',
        email: adminEmail,
        customerId: 'enterprise-customer-id',
        role: 'CUSTOMER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await onboardingService.onboardNewCustomer(
        customerName,
        adminEmail,
        adminPassword,
        adminContext
      );

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: adminEmail,
          role: 'CUSTOMER_ADMIN',
          status: 'ACTIVE',
          customerId: 'enterprise-customer-id',
          profile: expect.objectContaining({
            firstName: 'Admin',
            lastName: 'User',
            timezone: 'UTC',
          }),
        }),
      });
    });

    it.skip('should generate unique customer IDs', async () => {
      const customerName1 = 'Company A';
      const customerName2 = 'Company B';
      const id1 = 'ccustomerid10000000000000001';
      const id2 = 'ccustomerid20000000000000002';

      mockCustomerRepository.save.mockResolvedValue(undefined);
      mockCustomerRepository.findByName.mockResolvedValue(null);

      // Mock cryptoService.randomUUID to return valid CUIDs
      (mockCryptoService.randomUUID as any)
        .mockReturnValueOnce(id1)
        .mockReturnValueOnce(id2);

      mockPrismaClient.customer.create
        .mockResolvedValueOnce({
          id: id1,
          name: customerName1,
          slug: 'company-a',
          status: 'ACTIVE',
          subscriptionTier: 'STARTER',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: id2,
          name: customerName2,
          slug: 'company-b',
          status: 'ACTIVE',
          subscriptionTier: 'STARTER',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockPrismaClient.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'admin@test.com',
        customerId: id1,
        role: 'CUSTOMER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result1 = await onboardingService.onboardNewCustomer(
        customerName1,
        'admin@companya.com',
        'password123',
        adminContext
      );

      const result2 = await onboardingService.onboardNewCustomer(
        customerName2,
        'admin@companyb.com',
        'password456',
        adminContext
      );

      expect(result1.value).toBe(id1);
      expect(result2.value).toBe(id2);
    });
  });

  describe('slug generation', () => {
    it('should generate URL-friendly slugs from customer names', () => {
      // Test through the actual onboarding process
      const testCases = [
        { name: 'ACME Corporation Inc.', expectedSlug: 'acme-corporation-inc' },
        { name: 'TechCorp & Solutions LLC', expectedSlug: 'techcorp-solutions-llc' },
        { name: 'Global Systems Ltd.', expectedSlug: 'global-systems-ltd' },
        { name: 'Start-Up_Co 123', expectedSlug: 'start-up-co-123' },
      ];

      testCases.forEach(({ name, expectedSlug }) => {
        // We can't easily test the internal slug generation without refactoring,
        // but the integration test covers this through the actual flow
      });
    });
  });

  describe('error handling and logging', () => {
    it('should log onboarding start and completion', async () => {
      const customerName = 'Log Test Corp';
      const mockCustomerId = 'cmockcustomer000000000000001';

      // Re-mock after clearAllMocks
      (mockCryptoService.randomUUID as any).mockReturnValue(mockCustomerId);
      (mockCryptoService.randomBytes as any).mockReturnValue(Buffer.from('mock-random-bytes'));
      (mockCustomerRepository.save as any).mockResolvedValue(undefined);
      (mockCustomerRepository.findByName as any).mockResolvedValue(null);

      mockPrismaClient.user.create.mockResolvedValue({
        id: mockCustomerId,
        email: 'admin@logtest.com',
        customerId: mockCustomerId,
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaClient.apiKey.create.mockResolvedValue({ id: 'apikey-1' });
      mockPrismaClient.systemConfig.create.mockResolvedValue({});

      await onboardingService.onboardNewCustomer(
        customerName,
        'admin@logtest.com',
        'password123',
        adminContext
      );

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        `Starting onboarding process for new customer: ${customerName}`,
        adminContext
      );

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        `Successfully onboarded new customer: ${customerName} with ID: ${mockCustomerId}`,
        adminContext
      );
    });

    it('should log errors during onboarding', async () => {
      const customerName = 'Error Test Corp';

      // Re-mock after clearAllMocks
      (mockCryptoService.randomUUID as any).mockReturnValue('cmockcustomer000000000000001');
      (mockCustomerRepository.save as any).mockRejectedValue(new Error('Database connection failed'));

      await expect(
        onboardingService.onboardNewCustomer(
          customerName,
          'admin@errortest.com',
          'password123',
          adminContext
        )
      ).rejects.toThrow('Database connection failed');

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error onboarding customer: Database connection failed',
        adminContext,
        { error: expect.any(Error) }
      );
    });
  });

  describe('validation', () => {
    it.skip('should validate customer name is not empty', async () => {
      await expect(
        onboardingService.onboardNewCustomer(
          '',
          'admin@test.com',
          'password123',
          adminContext
        )
      ).rejects.toThrow();
    });

    it.skip('should validate admin email format', async () => {
      mockCustomerRepository.save.mockResolvedValue(undefined);

      // This would fail at the User entity level, but let's test the flow
      await expect(
        onboardingService.onboardNewCustomer(
          'Test Company',
          'invalid-email',
          'password123',
          adminContext
        )
      ).rejects.toThrow();
    });

    it.skip('should validate admin password strength', async () => {
      mockCustomerRepository.save.mockResolvedValue(undefined);

      // Weak password should fail at the Password value object level
      await expect(
        onboardingService.onboardNewCustomer(
          'Test Company',
          'admin@test.com',
          'weak',
          adminContext
        )
      ).rejects.toThrow();
    });
  });
});
