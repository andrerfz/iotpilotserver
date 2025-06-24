import { PrismaClient, UserRole } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import prisma from './db';

// Define the tenant context interface
export interface TenantContext {
  customerId: string | null;
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

// Create AsyncLocalStorage to store tenant context
export const tenantContext = new AsyncLocalStorage<TenantContext>();

// Create a tenant-aware Prisma client proxy
export class TenantPrismaClient {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  // Proxy handler to intercept Prisma client methods
  get client() {
    return new Proxy(this.prisma, {
      get: (target, prop) => {
        // Get the original property
        const originalValue = Reflect.get(target, prop);

        // If it's not a model property or not a function, return it as is
        if (
          typeof prop !== 'string' || 
          !['user', 'device', 'customer', 'session', 'apiKey', 'deviceMetric', 'deviceLog', 'deviceCommand', 'alert', 'systemConfig'].includes(prop) ||
          typeof originalValue !== 'object'
        ) {
          return originalValue;
        }

        // Create a proxy for the model
        return new Proxy(originalValue, {
          get: (model, method) => {
            const originalMethod = Reflect.get(model, method);

            // If it's not a function, return it as is
            if (typeof originalMethod !== 'function') {
              return originalMethod;
            }

            // Return a function that wraps the original method
            return (...args: any[]) => {
              const context = tenantContext.getStore();

              // If no context or it's a SUPERADMIN, execute without tenant filtering
              if (!context || context.isSuperAdmin) {
                return originalMethod.apply(model, args);
              }

              // For methods that need tenant filtering
              if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(method as string)) {
                // Add customerId to where clause for tenant isolation
                const [params = {}] = args;
                const newParams = { ...params };

                // Skip tenant filtering for Customer model when finding by id/slug/domain
                if (prop === 'customer' && 
                    newParams.where && 
                    (newParams.where.id || newParams.where.slug || newParams.where.domain)) {
                  return originalMethod.apply(model, [newParams]);
                }

                // Add customerId filter for all other queries
                if (!newParams.where) {
                  newParams.where = {};
                }

                // For User model, hide SUPERADMIN users
                if (prop === 'user') {
                  if (!newParams.where.AND) {
                    newParams.where.AND = [];
                  } else if (!Array.isArray(newParams.where.AND)) {
                    newParams.where.AND = [newParams.where.AND];
                  }

                  newParams.where.AND.push({
                    OR: [
                      { customerId: context.customerId },
                      { role: { not: 'SUPERADMIN' } }
                    ]
                  });
                } else if (prop !== 'customer') {
                  // For all other models except Customer, add customerId filter
                  newParams.where.customerId = context.customerId;
                }

                return originalMethod.apply(model, [newParams]);
              } 
              // For create operations
              else if (method === 'create') {
                const [params = {}] = args;
                const newParams = { ...params };

                // Add customerId to data for tenant isolation
                if (!newParams.data) {
                  newParams.data = {};
                }

                // Don't add customerId for Customer model
                if (prop !== 'customer') {
                  newParams.data.customerId = context.customerId;
                }

                return originalMethod.apply(model, [newParams]);
              }
              // For createMany operations
              else if (method === 'createMany') {
                const [params = {}] = args;
                const newParams = { ...params };

                // Add customerId to each data item for tenant isolation
                if (!newParams.data) {
                  newParams.data = [];
                }

                // Don't add customerId for Customer model
                if (prop !== 'customer' && Array.isArray(newParams.data)) {
                  newParams.data = newParams.data.map((item: any) => ({
                    ...item,
                    customerId: context.customerId
                  }));
                }

                return originalMethod.apply(model, [newParams]);
              }
              // For upsert operations
              else if (method === 'upsert') {
                const [params = {}] = args;
                const newParams = { ...params };

                // Ensure we only upsert records that belong to the tenant
                if (!newParams.where) {
                  newParams.where = {};
                }

                // For User model, prevent modification of SUPERADMIN users
                if (prop === 'user') {
                  // Handle create data
                  if (newParams.create && context.customerId) {
                    if (!newParams.create.customer) {
                      newParams.create.customer = { connect: { id: context.customerId } };
                    }
                  }

                  // Handle update data
                  if (newParams.update && context.customerId) {
                    if (!newParams.update.customer) {
                      newParams.update.customer = { connect: { id: context.customerId } };
                    }
                  }
                } else if (prop !== 'customer') {
                  // For all other models except Customer, add customerId filter
                  if (newParams.create) {
                    newParams.create.customerId = context.customerId;
                  }
                  if (newParams.update) {
                    newParams.update.customerId = context.customerId;
                  }
                }

                return originalMethod.apply(model, [newParams]);
              }
              // For update/delete operations
              else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(method as string)) {
                const [params = {}] = args;
                const newParams = { ...params };

                // Ensure we only update/delete records that belong to the tenant
                if (!newParams.where) {
                  newParams.where = {};
                }

                // For User model, prevent modification of SUPERADMIN users
                if (prop === 'user') {
                  if (!newParams.where.AND) {
                    newParams.where.AND = [];
                  } else if (!Array.isArray(newParams.where.AND)) {
                    newParams.where.AND = [newParams.where.AND];
                  }

                  newParams.where.AND.push({
                    role: { not: 'SUPERADMIN' }
                  });

                  if (context.customerId) {
                    newParams.where.AND.push({
                      customerId: context.customerId
                    });
                  }
                } else if (prop !== 'customer') {
                  // For all other models except Customer, add customerId filter
                  newParams.where.customerId = context.customerId;
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
}

// Create and export the tenant-aware Prisma client
export const tenantPrisma = new TenantPrismaClient(prisma);

// Helper function to run code with tenant context
export async function withTenant<T>(
  context: TenantContext,
  callback: () => Promise<T>
): Promise<T> {
  return tenantContext.run(context, callback);
}

// Helper function to get current tenant context
export function getCurrentTenant(): TenantContext | undefined {
  return tenantContext.getStore();
}
