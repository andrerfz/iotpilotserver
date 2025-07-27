import {TenantContext} from '../../domain/tenant-context';
import {StructuredLogger} from '../logging/structured-logger';
import {tenantContext} from './tenant-prisma.service';

const logger = StructuredLogger.forService('tenant-context');

/**
 * Executes code within a specific tenant context for multi-tenant isolation.
 * All database operations within the callback will be automatically filtered by the tenant context.
 *
 * @param context The tenant context containing user and tenant information
 * @param callback The function to execute within the tenant context
 * @returns The result of the callback function
 * @throws Error if tenant boundary violations occur
 *
 * @example
 * ```typescript
 * const result = await withTenant(tenantContext, async () => {
 *   return tenantPrisma.client.device.findMany();
 * });
 * ```
 */
export async function withTenant<T>(
    context: TenantContext,
    callback: () => Promise<T>
): Promise<T> {
    logger.debug('Setting context', {
        customerId: context.getCustomerId()?.getValue() || undefined,
        userId: context.getUserId().getValue(),
        isSuperAdmin: context.isSuperAdmin(),
        hasAsyncLocalStorage: typeof tenantContext.run === 'function'
    });

    const result = await tenantContext.run(context, async () => {
        const storedContext = tenantContext.getStore();
        logger.debug('Context inside run', {
            hasStoredContext: !!storedContext,
            storedCustomerId: storedContext?.customerId
        });
        return callback();
    });

    logger.debug('Context after run');
    return result;
}

/**
 * Helper function to get current tenant context
 */
export function getCurrentTenant(): TenantContext | undefined {
    return tenantContext.getStore();
}

