import {DependencyContainer} from 'tsyringe';
import type {InMemoryCommandBus} from '@iotpilot/core/shared/application/bus/command.bus';
import type {InMemoryQueryBus} from '@iotpilot/core/shared/application/bus/query.bus';
import type {InMemoryEventBus} from '@iotpilot/core/shared/application/bus/event.bus';

export interface HandlerRegistrationContext {
  commandBus: InMemoryCommandBus;
  queryBus: InMemoryQueryBus;
  eventBus: InMemoryEventBus;
  container: DependencyContainer;
}

/**
 * Interface for Bounded Context Service Providers
 * Similar to Laravel's ServiceProvider
 *
 * Each bounded context can have its own provider that registers:
 * - Repositories and Services (in register())
 * - Command/Query handlers (in registerHandlers())
 * - Event handlers (in registerHandlers())
 */
export interface BoundedContextProvider {
  /**
   * Register infrastructure services in the DI container.
   */
  register(container: DependencyContainer): void;

  /**
   * Register command, query, and event handlers with the buses.
   * Called after all providers have registered their infrastructure.
   */
  registerHandlers?(ctx: HandlerRegistrationContext): void;

  /**
   * Bootstrap services (optional).
   */
  boot?(container: DependencyContainer): void;

  /**
   * Get the bounded context name.
   */
  getContextName(): string;
}

/**
 * Factory function type for creating providers
 * Similar to Laravel's $provider::create($app)
 */
export type ProviderFactory = () => BoundedContextProvider;
