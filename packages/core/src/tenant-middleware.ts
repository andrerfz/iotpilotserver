// Re-export from infrastructure layer for backward compatibility
export {
    TenantPrismaClient,
    tenantPrisma,
    tenantContext,
    withTenant,
    getCurrentTenant,
    type TenantContext
} from './shared/infrastructure/tenant';
