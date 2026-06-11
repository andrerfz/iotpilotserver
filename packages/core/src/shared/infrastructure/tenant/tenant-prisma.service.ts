/// <reference types="node" />
import {PrismaService} from '../database/prisma.service';
import {StructuredLogger} from '../logging/structured-logger';

const logger = StructuredLogger.forService('tenant-prisma');

// Conditional import for async_hooks to avoid client-side issues
let AsyncLocalStorage: any;
try {
    // Try to import AsyncLocalStorage from Node.js async_hooks
    if (typeof (globalThis as any).window === 'undefined') {
        AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
    } else {
        throw new Error('Browser environment');
    }
} catch (error) {
    // Fallback for client-side or when async_hooks is not available
    class DummyStorage {
        private store: any = undefined;
        
        getStore() { 
            return this.store; 
        }
        
        async run(store: any, callback: () => any, ...args: any[]): Promise<any> { 
            const previousStore = this.store;
            this.store = store;
            try {
                const result = await callback(); 
                return result;
            } finally {
                this.store = previousStore;
            }
        }
    }
    AsyncLocalStorage = DummyStorage;
}

// Get PrismaClient type from PrismaService to avoid direct @prisma/client dependency
type PrismaClient = ReturnType<PrismaService['getClient']>;

// Create AsyncLocalStorage to store tenant context
export const tenantContext = new AsyncLocalStorage() as any; // Use type assertion to bypass type argument issue

/**
 * Tenant-aware Prisma client that automatically applies tenant isolation.
 * Intercepts all database operations to add tenant filtering based on the current tenant context.
 * SUPERADMIN users bypass tenant filtering for platform-wide operations.
 */
export class TenantPrismaClient {
    private prisma: PrismaClient;
    private readonly logger = StructuredLogger.forService('tenant-prisma-client');

    /**
     * Creates a new tenant-aware Prisma client.
     * @param prismaClient The base Prisma client instance
     */
    constructor(prismaClient: PrismaClient) {
        this.prisma = prismaClient;
    }

    // Proxy handler to intercept Prisma client methods
    get client() {
        return new Proxy(this.prisma, {
            get: (target, prop) => {
                // Get the original property
                const originalValue = Reflect.get(target, prop);

                this.logger.debug('Accessing property', {
                    prop: String(prop),
                    isString: typeof prop === 'string',
                    isModel: ['user', 'device', 'customer', 'session', 'apiKey', 'deviceMetric', 'deviceLog', 'deviceCommand', 'alert', 'systemConfig'].includes(String(prop)),
                    isObject: typeof originalValue === 'object'
                });

                // If it's not a model property or not a function, return it as is
                if (
                    typeof prop !== 'string' ||
                    !['user', 'device', 'customer', 'session', 'apiKey', 'deviceMetric', 'deviceLog', 'deviceCommand', 'alert', 'systemConfig'].includes(prop) ||
                    typeof originalValue !== 'object'
                ) {
                    return originalValue;
                }

                this.logger.debug(`Creating proxy for model: ${String(prop)}`);

                // Create a proxy for the model
                return new Proxy(originalValue, {
                    get: (model, method) => {
                        this.logger.debug(`Accessing method: ${String(prop)}.${String(method)}`);
                        const originalMethod = Reflect.get(model, method);

                        // If it's not a function, return it as is
                        if (typeof originalMethod !== 'function') {
                            return originalMethod;
                        }

                        // Return a function that wraps the original method
                        return (...args: any[]) => {
                            const context = tenantContext.getStore();
                            // Support both TenantContext (getCustomerId/isSuperAdmin methods) and plain { customerId, isSuperAdmin }
                            const customerId = (typeof (context as any)?.getCustomerId === 'function'
                                ? ((context as any).getCustomerId()?.getValue?.() ?? null)
                                : (context as any)?.customerId ?? null) as string | null;
                            const isSuperAdmin = (typeof (context as any)?.isSuperAdmin === 'function'
                                ? (context as any).isSuperAdmin()
                                : !!(context as any)?.isSuperAdmin);

                            this.logger.debug(`Context check for ${String(prop)}.${String(method)}`, {
                                hasContext: !!context,
                                isSuperAdmin,
                                customerId
                            });

                            // If SUPERADMIN, execute without tenant filtering
                            if (isSuperAdmin) {
                                this.logger.debug(`BYPASSING tenant filtering - SUPERADMIN`);
                                return originalMethod.apply(model, args);
                            }

                            // If no context, check if this is an allowed operation
                            if (!context) {
                                // Allow session lookups without tenant context (needed for auth)
                                if (prop === 'session') {
                                    this.logger.debug(`ALLOWING session operation without context`);
                                    return originalMethod.apply(model, args);
                                }

                                // For user lookups, allow if it's a read operation (needed for session validation)
                                if (prop === 'user' && ['findUnique', 'findFirst', 'findMany'].includes(method as string)) {
                                    this.logger.debug(`ALLOWING user read operation without context for auth`);
                                    return originalMethod.apply(model, args);
                                }

                                // All other operations without context are security violations
                                const error = new Error(
                                    `TenantMiddleware: SECURITY VIOLATION: Attempted to access ${String(prop)}.${String(method)} without tenant context. ` +
                                    `All database operations must be executed within a tenant context using withTenant().`
                                );
                                this.logger.error('Tenant boundary violation', {
                                    prop: String(prop),
                                    method: String(method),
                                    securityEvent: 'TENANT_CONTEXT_MISSING'
                                }, error);
                                throw error;
                            }

                            // For methods that need tenant filtering
                            if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(method as string)) {
                                // Add customerId to where clause for tenant isolation
                                const [params = {}] = args;
                                const newParams = {...params};

                                // For Customer model, only allow access to the customer that matches the tenant ID
                                if (prop === 'customer') {
                                    if (!newParams.where) {
                                        newParams.where = {};
                                    }
                                    // If looking up by ID, ensure it matches the tenant ID
                                    if (newParams.where.id && newParams.where.id !== customerId) {
                                        // For findUnique/findFirst, return null if ID doesn't match tenant ID
                                        if (method === 'findUnique' || method === 'findFirst') {
                                            return null;
                                        }
                                        // For findMany, add ID filter to ensure only the tenant's customer is returned
                                        newParams.where.id = customerId;
                                    }
                                    // If not looking up by ID, ensure any results are filtered to the tenant's customer
                                    else if (!newParams.where.id) {
                                        if (!newParams.where.AND) {
                                            newParams.where.AND = [];
                                        } else if (!Array.isArray(newParams.where.AND)) {
                                            newParams.where.AND = [newParams.where.AND];
                                        }
                                        newParams.where.AND.push({id: customerId});
                                    }
                                }

                                // Add customerId filter for all other queries
                                if (!newParams.where) {
                                    newParams.where = {};
                                }

                                // For User model: Allow access to tenant users OR non-SUPERADMIN users (for cross-tenant visibility)
                                if (prop === 'user') {
                                    this.addUserAccessFilter(newParams, customerId);
                                } else if (prop !== 'customer') {
                                    // For all other models except Customer, add customerId filter
                                    newParams.where.customerId = customerId;
                                }

                                return originalMethod.apply(model, [newParams]);
                            }
                            // For create operations
                            else if (method === 'create') {
                                const [params = {}] = args;
                                const newParams = {...params};

                                // Add customerId to data for tenant isolation
                                if (!newParams.data) {
                                    newParams.data = {};
                                }

                                // Don't add customerId for Customer model
                                if (prop !== 'customer') {
                                    newParams.data.customerId = customerId;
                                }

                                return originalMethod.apply(model, [newParams]);
                            }
                            // For createMany operations
                            else if (method === 'createMany') {
                                const [params = {}] = args;
                                const newParams = {...params};

                                // Add customerId to each data item for tenant isolation
                                if (!newParams.data) {
                                    newParams.data = [];
                                }

                                // Don't add customerId for Customer model
                                if (prop !== 'customer' && Array.isArray(newParams.data)) {
                                    newParams.data = newParams.data.map((item: any) => ({
                                        ...item,
                                        customerId: customerId
                                    }));
                                }

                                return originalMethod.apply(model, [newParams]);
                            }
                            // For upsert operations
                            else if (method === 'upsert') {
                                const [params = {}] = args;
                                const newParams = {...params};

                                // Ensure we only upsert records that belong to the tenant
                                if (!newParams.where) {
                                    newParams.where = {};
                                }

                                // For User model, prevent modification of SUPERADMIN users
                                if (prop === 'user') {
                                    // Handle create data
                                    if (newParams.create && customerId) {
                                        if (!newParams.create.customer) {
                                            newParams.create.customer = {connect: {id: customerId}};
                                        }
                                    }

                                    // Handle update data
                                    if (newParams.update && customerId) {
                                        if (!newParams.update.customer) {
                                            newParams.update.customer = {connect: {id: customerId}};
                                        }
                                    }
                                } else if (prop !== 'customer') {
                                    // For all other models except Customer, add customerId filter
                                    if (newParams.create) {
                                        newParams.create.customerId = customerId;
                                    }
                                    if (newParams.update) {
                                        newParams.update.customerId = customerId;
                                    }
                                }

                                return originalMethod.apply(model, [newParams]);
                            }
                            // For update/delete operations
                            else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(method as string)) {
                                const [params = {}] = args;
                                const newParams = {...params};

                                this.logger.debug(`${String(prop)}.${String(method)} called`, {
                                    hasWhere: !!newParams.where,
                                    whereId: newParams.where?.id,
                                    contextCustomerId: customerId
                                });

                                // Ensure we only update/delete records that belong to the tenant
                                if (!newParams.where) {
                                    newParams.where = {};
                                }

                                // For User model, prevent modification of SUPERADMIN users and filter by tenant
                                if (prop === 'user') {
                                    this.addSuperAdminProtection(newParams);
                                    if (customerId) {
                                        newParams.where.AND.push({
                                            customerId: customerId
                                        });
                                    }
                                } else if (prop === 'customer') {
                                    // For Customer model, ensure we only update/delete the tenant's customer
                                    // Check if trying to access a different customer's data
                                    if (newParams.where.id) {
                                        const requestedId = newParams.where.id;
                                        const tenantId = customerId;
                                        const methodName = String(method);

                                        // Log for debugging
                                        this.logger.debug(`Customer ${methodName} operation`, {
                                            requestedId,
                                            tenantId,
                                            match: requestedId === tenantId
                                        });

                                        // If the requested ID doesn't match the tenant ID, reject the operation
                                        if (requestedId !== tenantId) {
                                            const error = new Error(
                                                `Tenant boundary violation: Cannot ${methodName} customer that does not belong to your tenant. ` +
                                                `Tenant ID: ${tenantId}, Requested ID: ${requestedId}`
                                            );
                                            this.logger.error('Tenant boundary violation', {
                                                requestedId,
                                                tenantId,
                                                method: methodName,
                                                securityEvent: 'TENANT_BOUNDARY_VIOLATION'
                                            }, error);
                                            throw error;
                                        }
                                    } else {
                                        // If no ID is specified, default to the tenant's customer ID
                                        if (customerId) {
                                            newParams.where.id = customerId;
                                        }
                                    }
                                } else {
                                    // For all other models, add customerId filter
                                    newParams.where.customerId = customerId;
                                }

                                return originalMethod.apply(model, [newParams]);
                            }

                            // For any other method, just pass through
                            return originalMethod.apply(model, args);
                        };
                    }
                });
            }
        });
    }

    /**
     * Adds user access filtering logic to database queries.
     * Implements the business rule: Users can see their own tenant users plus all non-SUPERADMIN users.
     * This enables cross-tenant visibility of regular users while protecting SUPERADMIN accounts.
     *
     * @param params The Prisma query parameters object to modify
     * @param customerId The current tenant's customer ID
     */
    private addUserAccessFilter(params: any, customerId: string | null): void {
        if (!params.where.AND) {
            params.where.AND = [];
        } else if (!Array.isArray(params.where.AND)) {
            params.where.AND = [params.where.AND];
        }

        // Allow access to:
        // - Users from the current tenant (customerId match)
        // - OR non-SUPERADMIN users (for cross-tenant visibility)
        params.where.AND.push({
            OR: [
                // Users from current tenant
                { customerId: customerId },
                // Non-SUPERADMIN users (visible across tenants)
                { role: { not: 'SUPERADMIN' } }
            ]
        });
    }

    /**
     * Adds SUPERADMIN protection to user modification queries.
     * Prevents any operations (update, delete) on SUPERADMIN user accounts.
     * This is a critical security measure to prevent privilege escalation attacks.
     *
     * @param params The Prisma query parameters object to modify
     */
    private addSuperAdminProtection(params: any): void {
        if (!params.where.AND) {
            params.where.AND = [];
        } else if (!Array.isArray(params.where.AND)) {
            params.where.AND = [params.where.AND];
        }

        // Prevent any operations on SUPERADMIN users
        params.where.AND.push({
            role: { not: 'SUPERADMIN' }
        });
    }
}

