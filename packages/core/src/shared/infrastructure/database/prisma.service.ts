import {PrismaClient} from '@prisma/client';

export class PrismaService {
  private readonly client = new PrismaClient();

  getClient(): PrismaClient {
    return this.client;
  }

  getTenantClient(tenantId?: string | null): PrismaClient {
    // For multi-tenancy, you might want to use schema-based isolation
    // or connection pooling per tenant. For now, return the main client
    return this.client;
  }

  async close(): Promise<void> {
    await this.client.$disconnect();
  }
}

// Singleton instance
export const prisma = new PrismaService();
