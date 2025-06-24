import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { UserId } from '@/lib/user/domain/value-objects/user-id.vo';
import { tenantPrisma, withTenant, TenantContext } from '@/lib/tenant-middleware';
import { UserRole } from '@prisma/client';

export interface TestFixture {
  tenantIds: CustomerId[];
  userIds: UserId[];
  contexts: TenantContext[];
  tenantTestUtils: TenantTestUtils;
}

export class TenantTestUtils {
  async runWithTenantContext<T>(context: TenantContext, fn: () => Promise<T>): Promise<T> {
    // Use the withTenant function to run with the tenant context
    return await withTenant(context, fn);
  }

  async cleanupTestData(tenantIds: CustomerId[], userIds: UserId[]): Promise<void> {
    // Delete test users
    for (const userId of userIds) {
      await tenantPrisma.client.user.delete({
        where: { id: userId.getValue() }
      }).catch(() => {
      });
    }

    // Delete test tenants
    for (const tenantId of tenantIds) {
      await tenantPrisma.client.customer.delete({
        where: { id: tenantId.getValue() }
      }).catch(() => {
      });
    }
  }
}

export class TestFixtureFactory {
  async createCrossTenantFixture(): Promise<TestFixture> {
    const tenantTestUtils = new TenantTestUtils();

    // Create test tenant IDs
    const tenant1Id = CustomerId.create('test-tenant-1');
    const tenant2Id = CustomerId.create('test-tenant-2');

    // Create test user IDs
    const user1Id = UserId.create('test-user-1');
    const user2Id = UserId.create('test-user-2');
    const adminId = UserId.create('test-admin');

    // Create tenant contexts
    const tenant1Context: TenantContext = {
      customerId: tenant1Id.getValue(),
      userId: user1Id.getValue(),
      role: 'ADMIN' as UserRole,
      isSuperAdmin: false
    };

    const tenant2Context: TenantContext = {
      customerId: tenant2Id.getValue(),
      userId: user2Id.getValue(),
      role: 'ADMIN' as UserRole,
      isSuperAdmin: false
    };

    const adminContext: TenantContext = {
      customerId: null,
      userId: adminId.getValue(),
      role: 'SUPERADMIN' as UserRole,
      isSuperAdmin: true
    };

    return {
      tenantIds: [tenant1Id, tenant2Id],
      userIds: [user1Id, user2Id, adminId],
      contexts: [tenant1Context, tenant2Context, adminContext],
      tenantTestUtils
    };
  }
}
