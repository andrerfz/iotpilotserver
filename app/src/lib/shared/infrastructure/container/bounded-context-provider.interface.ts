import {DependencyContainer} from 'tsyringe';

/**
 * Interface for Bounded Context Service Providers
 * Similar to Laravel's ServiceProvider
 * 
 * Each bounded context can have its own provider that registers:
 * - Repositories
 * - Services
 * - Command/Query handlers
 * - Value Objects factories
 */
export interface BoundedContextProvider {
  /**
   * Register services in the DI container
   * Similar to Laravel's ServiceProvider::register()
   */
  register(container: DependencyContainer): void;

  /**
   * Bootstrap services (optional)
   * Similar to Laravel's ServiceProvider::boot()
   */
  boot?(container: DependencyContainer): void;

  /**
   * Get the bounded context name
   */
  getContextName(): string;
}

/**
 * Factory function type for creating providers
 * Similar to Laravel's $provider::create($app)
 */
export type ProviderFactory = () => BoundedContextProvider;
