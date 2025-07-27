import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider} from '@/lib/shared/infrastructure/container/bounded-context-provider.interface';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';
import {PrismaCustomerRepository} from '@/lib/customer/infrastructure/repositories/prisma-customer.repository';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

/**
 * Customer Bounded Context Service Provider
 * Registers all customer-related dependencies
 */
export class CustomerServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Customer';
  }

  register(container: DependencyContainer): void {
    // Register CustomerRepository
    container.register<CustomerRepository>('CustomerRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaCustomerRepository(prisma);
      }
    });
  }

  boot?(container: DependencyContainer): void {
    console.log('[CustomerProvider] Customer bounded context registered');
  }
}

// Factory function
export const createCustomerProvider = (): BoundedContextProvider => {
  return new CustomerServiceProvider();
};
