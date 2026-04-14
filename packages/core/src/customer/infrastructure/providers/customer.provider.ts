import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider, HandlerRegistrationContext} from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';
import {PrismaCustomerRepository} from '@iotpilot/core/customer/infrastructure/repositories/prisma-customer.repository';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

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

  registerHandlers(ctx: HandlerRegistrationContext): void {
    const {commandBus, queryBus, container} = ctx;

    const {GetCustomerByDomainQuery} = require('@iotpilot/core/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query');
    const {GetCustomerByDomainHandler} = require('@iotpilot/core/customer/application/queries/get-customer-by-domain/get-customer-by-domain.handler');
    const {CreateCustomerCommand} = require('@iotpilot/core/customer/application/commands/create-customer/create-customer.command');
    const {CreateCustomerHandler} = require('@iotpilot/core/customer/application/commands/create-customer/create-customer.handler');

    const customerRepo = container.resolve('CustomerRepository');
    const cryptoService = container.resolve('CryptoService');

    queryBus.register(GetCustomerByDomainQuery, new GetCustomerByDomainHandler(customerRepo));
    commandBus.register(CreateCustomerCommand, new CreateCustomerHandler(customerRepo, cryptoService));
  }

  boot?(container: DependencyContainer): void {
    console.log('[CustomerProvider] Customer bounded context registered');
  }
}

// Factory function
export const createCustomerProvider = (): BoundedContextProvider => {
  return new CustomerServiceProvider();
};
