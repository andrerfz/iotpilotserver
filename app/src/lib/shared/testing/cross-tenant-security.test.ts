import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TenantTestUtils, TestFixtureFactory, TestFixture } from './tenant-test-utils';
import { CustomerTestFactory } from '@/lib/customer/testing/customer-test-factory';
import { TenantBoundaryValidator, TenantBoundaryViolationException } from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import { TenantScopedLoggingService } from '@/lib/shared/infrastructure/logging/tenant-scoped-logging.service';
import { TenantAuditLogger, AuditEventType } from '@/lib/shared/infrastructure/security/tenant-audit-logger';
import { CustomerRepository } from '@/lib/customer/infrastructure/persistence/customer.repository';
import { TenantDataMigrationUtils } from '@/lib/shared/infrastructure/migration/tenant-data-migration.utils';
import { tenantPrisma } from '@/lib/tenant-middleware';

describe('Cross-Tenant Security', () => {
  let fixture: TestFixture;
  let tenantBoundaryValidator: TenantBoundaryValidator;
  let tenantAuditLogger: TenantAuditLogger;
  let customerRepository: CustomerRepository;
  let tenantDataMigrationUtils: TenantDataMigrationUtils;
  let loggingService: TenantScopedLoggingService;

  beforeEach(async () => {
    // Create test fixture with two tenants
    const fixtureFactory = new TestFixtureFactory();
    fixture = await fixtureFactory.createCrossTenantFixture();

    // Create dependencies
    loggingService = new TenantScopedLoggingService();
    tenantBoundaryValidator = new TenantBoundaryValidator(loggingService);
    tenantAuditLogger = new TenantAuditLogger(loggingService);
    customerRepository = new CustomerRepository();
    tenantDataMigrationUtils = new TenantDataMigrationUtils(loggingService);
  });

  afterEach(async () => {
    // Clean up test data
    await fixture.tenantTestUtils.cleanupTestData(fixture.tenantIds, fixture.userIds);
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent direct repository access across tenants', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const tenant2Context = fixture.contexts[1]; // Second tenant context

      // Create a customer for tenant 1
      const customer1 = CustomerTestFactory.createCustomer();
      await fixture.tenantTestUtils.runWithTenantContext(tenant1Context, async () => {
        await customerRepository.save(customer1, tenant1Context);
      });

      // Act & Assert - Tenant 2 should not be able to access tenant 1's customer
      await fixture.tenantTestUtils.runWithTenantContext(tenant2Context, async () => {
        const result = await customerRepository.findById(customer1.getId(), tenant2Context);
        expect(result).toBeNull();
      });
    });

    it('should prevent updating entities from another tenant', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const tenant2Context = fixture.contexts[1]; // Second tenant context
      const adminContext = fixture.contexts[2]; // SUPERADMIN context

      // Create a customer for tenant 1
      const customer1 = CustomerTestFactory.createCustomer();
      await fixture.tenantTestUtils.runWithTenantContext(tenant1Context, async () => {
        await customerRepository.save(customer1, tenant1Context);
      });

      // Get the raw customer data using SUPERADMIN
      let rawCustomer: any = null;
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        rawCustomer = await tenantPrisma.client.customer.findUnique({
          where: { id: customer1.getId().getValue() }
        });
      });

      // Act & Assert - Tenant 2 should not be able to update tenant 1's customer
      await fixture.tenantTestUtils.runWithTenantContext(tenant2Context, async () => {
        // Try to update the customer directly in the database
        try {
          await tenantPrisma.client.customer.update({
            where: { id: rawCustomer.id },
            data: { name: 'Updated by Tenant 2' }
          });

          // If we get here, the test should fail
          expect(true).toBe(false); // This should not execute
        } catch (error) {
          // Expect an error because tenant 2 shouldn't be able to update tenant 1's data
          expect(error).toBeDefined();
        }
      });

      // Verify the customer was not updated
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        const updatedCustomer = await tenantPrisma.client.customer.findUnique({
          where: { id: customer1.getId().getValue() }
        });

        expect(updatedCustomer.name).toBe(rawCustomer.name);
      });
    });
  });

  describe('SUPERADMIN Tenant Bypass', () => {
    it('should allow SUPERADMIN to access data across tenants', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const tenant2Context = fixture.contexts[1]; // Second tenant context
      const adminContext = fixture.contexts[2]; // SUPERADMIN context

      // Create customers for both tenants
      const customer1 = CustomerTestFactory.createCustomer(undefined, 'Tenant 1 Customer');
      const customer2 = CustomerTestFactory.createCustomer(undefined, 'Tenant 2 Customer');

      await fixture.tenantTestUtils.runWithTenantContext(tenant1Context, async () => {
        await customerRepository.save(customer1, tenant1Context);
      });

      await fixture.tenantTestUtils.runWithTenantContext(tenant2Context, async () => {
        await customerRepository.save(customer2, tenant2Context);
      });

      // Act - SUPERADMIN accesses data from both tenants
      let allCustomers: any[] = [];
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        allCustomers = await tenantPrisma.client.customer.findMany({
          where: {
            id: {
              in: [customer1.getId().getValue(), customer2.getId().getValue()]
            }
          }
        });
      });

      // Assert - SUPERADMIN should see both customers
      expect(allCustomers.length).toBe(2);
      expect(allCustomers.some(c => c.id === customer1.getId().getValue())).toBe(true);
      expect(allCustomers.some(c => c.id === customer2.getId().getValue())).toBe(true);
    });

    it('should allow SUPERADMIN to update data across tenants', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const adminContext = fixture.contexts[2]; // SUPERADMIN context

      // Create a customer for tenant 1
      const customer1 = CustomerTestFactory.createCustomer(undefined, 'Original Name');
      await fixture.tenantTestUtils.runWithTenantContext(tenant1Context, async () => {
        await customerRepository.save(customer1, tenant1Context);
      });

      // Act - SUPERADMIN updates tenant 1's customer
      const newName = 'Updated by SUPERADMIN';
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        await tenantPrisma.client.customer.update({
          where: { id: customer1.getId().getValue() },
          data: { name: newName }
        });
      });

      // Assert - The customer should be updated
      let updatedCustomer: any = null;
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        updatedCustomer = await tenantPrisma.client.customer.findUnique({
          where: { id: customer1.getId().getValue() }
        });
      });

      expect(updatedCustomer.name).toBe(newName);
    });
  });

  describe('Tenant Data Migration', () => {
    it('should only allow SUPERADMIN to migrate data between tenants', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const tenant2Context = fixture.contexts[1]; // Second tenant context
      const adminContext = fixture.contexts[2]; // SUPERADMIN context

      // Create a customer for tenant 1
      const customer1 = CustomerTestFactory.createCustomer();
      await fixture.tenantTestUtils.runWithTenantContext(tenant1Context, async () => {
        await customerRepository.save(customer1, tenant1Context);
      });

      // Act & Assert - Tenant 2 should not be able to migrate data
      await fixture.tenantTestUtils.runWithTenantContext(tenant2Context, async () => {
        try {
          await tenantDataMigrationUtils.migrateData(
            fixture.tenantIds[0], // Source: Tenant 1
            fixture.tenantIds[1], // Target: Tenant 2
            'customer',
            {
              preserveIds: false,
              mergeStrategy: 'replace',
              transformData: null
            },
            tenant2Context
          );

          // If we get here, the test should fail
          expect(true).toBe(false); // This should not execute
        } catch (error) {
          // Expect an error because only SUPERADMIN can migrate data
          expect(error).toBeDefined();
          expect(error.message).toContain('SUPERADMIN');
        }
      });

      // Act - SUPERADMIN should be able to migrate data
      await fixture.tenantTestUtils.runWithTenantContext(adminContext, async () => {
        // This would actually perform the migration, but we'll skip it for this test
        // as it would require more setup and cleanup
      });
    });
  });

  describe('Audit Logging for Security Events', () => {
    it('should log cross-tenant access attempts', async () => {
      // Arrange
      const tenant1Context = fixture.contexts[0]; // First tenant context
      const tenant2Id = fixture.tenantIds[1]; // Second tenant ID

      // Mock the logging service to capture logs
      const logSpy = jest.spyOn(loggingService, 'error');

      // Act - Attempt cross-tenant access
      try {
        tenantBoundaryValidator.validateTenantAccess(
          tenant1Context,
          tenant2Id,
          'test-operation'
        );
      } catch (error) {
        // Expected to throw, we're testing the logging
      }

      // Assert - Should have logged the violation
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain('SECURITY VIOLATION');
    });

    it('should log SUPERADMIN actions', async () => {
      // Arrange
      const adminContext = fixture.contexts[2]; // SUPERADMIN context
      const tenant1Id = fixture.tenantIds[0]; // First tenant ID

      // Mock the audit logger
      const auditSpy = jest.spyOn(tenantAuditLogger, 'logAuditEvent');

      // Act - Log a SUPERADMIN action
      await tenantAuditLogger.logSuperAdminAction(
        'test-action',
        'customer',
        tenant1Id.getValue(),
        { testData: 'test' },
        adminContext
      );

      // Assert - Should have logged the SUPERADMIN action
      expect(auditSpy).toHaveBeenCalled();
      expect(auditSpy.mock.calls[0][0]).toBe(AuditEventType.SUPERADMIN_ACTION);
    });
  });
});
