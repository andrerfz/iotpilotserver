import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider, HandlerRegistrationContext} from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';
import {PrismaCustomerRepository} from '@iotpilot/core/customer/infrastructure/repositories/prisma-customer.repository';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

export class CustomerServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Customer';
  }

  register(container: DependencyContainer): void {
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
    const {GetCustomerQuery} = require('@iotpilot/core/customer/application/queries/get-customer/get-customer.query');
    const {GetCustomerHandler} = require('@iotpilot/core/customer/application/queries/get-customer/get-customer.handler');
    const {GetCustomerSettingsQuery} = require('@iotpilot/core/customer/application/queries/get-customer-settings/get-customer-settings.query');
    const {GetCustomerSettingsHandler} = require('@iotpilot/core/customer/application/queries/get-customer-settings/get-customer-settings.handler');
    const {ListCustomersQuery} = require('@iotpilot/core/customer/application/queries/list-customers/list-customers.query');
    const {ListCustomersHandler} = require('@iotpilot/core/customer/application/queries/list-customers/list-customers.handler');

    const {CreateCustomerCommand} = require('@iotpilot/core/customer/application/commands/create-customer/create-customer.command');
    const {CreateCustomerHandler} = require('@iotpilot/core/customer/application/commands/create-customer/create-customer.handler');
    const {UpdateCustomerCommand} = require('@iotpilot/core/customer/application/commands/update-customer/update-customer.command');
    const {UpdateCustomerHandler} = require('@iotpilot/core/customer/application/commands/update-customer/update-customer.handler');
    const {DeactivateCustomerCommand} = require('@iotpilot/core/customer/application/commands/deactivate-customer/deactivate-customer.command');
    const {DeactivateCustomerHandler} = require('@iotpilot/core/customer/application/commands/deactivate-customer/deactivate-customer.handler');

    const customerRepo = container.resolve('CustomerRepository');
    const cryptoService = container.resolve('CryptoService');
    const eventBus = ctx.eventBus;

    queryBus.register(GetCustomerByDomainQuery, new GetCustomerByDomainHandler(customerRepo));
    queryBus.register(GetCustomerQuery, new GetCustomerHandler(customerRepo));
    queryBus.register(GetCustomerSettingsQuery, new GetCustomerSettingsHandler(customerRepo));
    queryBus.register(ListCustomersQuery, new ListCustomersHandler(customerRepo));

    commandBus.register(CreateCustomerCommand, new CreateCustomerHandler(customerRepo, cryptoService, eventBus));
    commandBus.register(UpdateCustomerCommand, new UpdateCustomerHandler(customerRepo));
    commandBus.register(DeactivateCustomerCommand, new DeactivateCustomerHandler(customerRepo, eventBus));
  }

  boot?(container: DependencyContainer): void {
    console.log('[CustomerProvider] Customer bounded context registered');
  }
}

export const createCustomerProvider = (): BoundedContextProvider => {
  return new CustomerServiceProvider();
};
