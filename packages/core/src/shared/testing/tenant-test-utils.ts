/**
 * Test fixture utilities for cross-tenant and tenant-isolation tests.
 * Provides TestFixture and TestFixtureFactory for tests that need multi-tenant setup.
 *
 * NOTE: createCrossTenantFixture is a stub. Full implementation would require
 * database seeding and TenantContext setup. Tests in cross-tenant-security.test.ts
 * are currently describe.skip'd. tenant-isolation.test.ts may need a real implementation.
 */

export interface TestFixture {
  tenantIds: unknown[];
  userIds: unknown[];
  contexts: unknown[];
  tenantTestUtils: {
    cleanupTestData: (tenantIds: unknown[], userIds: unknown[]) => Promise<void>;
    runWithTenantContext: <T>(context: unknown, fn: () => T | Promise<T>) => Promise<T>;
  };
}

export class TestFixtureFactory {
  async createCrossTenantFixture(): Promise<TestFixture> {
    return {
      tenantIds: [],
      userIds: [],
      contexts: [],
      tenantTestUtils: {
        cleanupTestData: async () => {},
        runWithTenantContext: async <T>(_ctx: unknown, fn: () => T | Promise<T>): Promise<T> => fn(),
      },
    };
  }
}
