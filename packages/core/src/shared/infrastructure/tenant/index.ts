// Re-export tenant infrastructure services
export { TenantPrismaClient, tenantContext } from './tenant-prisma.service';
export { withTenant, getCurrentTenant } from './tenant-context.service';
export type { TenantContext } from '../../domain/tenant-context';

// Create and export the tenant-aware Prisma client singleton
import {PrismaService} from '../database/prisma.service';
import {TenantPrismaClient} from './tenant-prisma.service';

const prismaService = new PrismaService();
export const tenantPrisma = new TenantPrismaClient(prismaService.getClient());

