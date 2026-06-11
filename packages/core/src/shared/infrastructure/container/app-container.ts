import 'reflect-metadata';
import {container, DependencyContainer} from 'tsyringe';
import {prisma as prismaServiceInstance, PrismaService} from '../database/prisma.service';
import {StructuredLogger} from '../logging/structured-logger';
import {NodeCryptoService} from '../crypto/node-crypto.service';
import {CryptoService} from '../../domain/interfaces/crypto-service.interface';
import {ZodValidationService} from '../validation/zod-validation.service';
import {ValidationService} from '../../domain/interfaces/validation-service.interface';
import {BoundedContextProvider, ProviderFactory} from './bounded-context-provider.interface';
import type {JobQueue} from '../../application/interfaces/job-queue.interface';

// Bounded Context Providers (auto-discovered)
import {createDeviceProvider} from '@iotpilot/core/device/infrastructure/providers/device.provider';
import {createUserProvider} from '@iotpilot/core/user/infrastructure/providers/user.provider';
import {createCustomerProvider} from '@iotpilot/core/customer/infrastructure/providers/customer.provider';
import {createMonitoringProvider} from '@iotpilot/core/monitoring/infrastructure/providers/monitoring.provider';
import {createNotificationProvider} from '@iotpilot/core/notification/infrastructure/providers/notification.provider';

/**
 * Dependency Injection Container using tsyringe
 * Provides Laravel-like automatic dependency resolution with auto-discovery
 * 
 * - Registers shared services (singletons)
 * - Auto-discovers bounded context providers
 * - Registers all dependencies from each bounded context
 * 
 * Usage:
 *   const userRepo = AppContainer.resolve<UserRepository>('UserRepository');
 *   const service = AppContainer.resolve<UserSessionService>('UserSessionService');
 *   // All dependencies are automatically resolved!
 */
export class AppContainer {
  private static instance: DependencyContainer;
  private static initialized = false;
  private static boundedContextProviders: BoundedContextProvider[] = [];

  /**
   * Initialize and configure the DI container
   * Similar to Laravel's ServiceProvider::register()
   */
  static initialize(): DependencyContainer {
    if (AppContainer.instance && AppContainer.initialized) {
      return AppContainer.instance;
    }

    // Clear container if reinitializing
    if (AppContainer.instance) {
      container.clearInstances();
    }

    console.log('[AppContainer] Initializing DI container...');

    // 1. Register shared services (singletons) - like Laravel's registerSharedServices()
    AppContainer.registerSharedServices();

    // 2. Auto-discover and register bounded context providers - like Laravel's resolveDDDProviders()
    AppContainer.discoverAndRegisterBoundedContexts();

    AppContainer.instance = container;
    AppContainer.initialized = true;

    console.log('[AppContainer] DI container initialized successfully');
    return container;
  }

  /**
   * Register shared services (singletons)
   * Similar to Laravel's registerSharedServices()
   */
  private static registerSharedServices(): void {
    console.log('[AppContainer] Registering shared services...');

    container.register<PrismaService>('PrismaService', {
      useValue: prismaServiceInstance
    });

    container.register<CryptoService>('CryptoService', {
      useValue: new NodeCryptoService()
    });

    container.register<ValidationService>('ValidationService', {
      useValue: new ZodValidationService()
    });

    container.register<StructuredLogger>('StructuredLogger', {
      useFactory: () => StructuredLogger.forService('service-container')
    });

    // Register BullMQ Job Queue (server-side only — avoid bundling in client)
    if (typeof (globalThis as any).window === 'undefined') {
      try {
        const { RedisConnectionFactory } = require('../redis/redis-connection.factory');
        const { BullMqJobQueue } = require('../queue/bullmq-job-queue');

        const redisFactory = RedisConnectionFactory.getInstance();
        container.register('RedisConnectionFactory', { useValue: redisFactory });
        container.register<JobQueue>('JobQueue', {
          useFactory: () => new BullMqJobQueue(redisFactory),
        });
        console.log('[AppContainer] Job queue registered (Redis DB 1)');
      } catch (error) {
        console.warn('[AppContainer] Job queue not available:', (error as Error).message);
      }
    }

    // Email Service (server-side only)
    if (typeof (globalThis as any).window === 'undefined') {
      try {
        const { NodemailerEmailService } = require('@iotpilot/core/shared/infrastructure/services/email.service');
        container.register('EmailService', {
          useFactory: () => new NodemailerEmailService()
        });
        console.log('[AppContainer] Email service registered');
      } catch (e) {
        console.warn('[AppContainer] Email service not available:', (e as Error).message);
      }
    }

    console.log('[AppContainer] Shared services registered');
  }

  /**
   * Auto-discover and register bounded context providers
   * Similar to Laravel's resolveDDDProviders() + foreach register()
   */
  private static discoverAndRegisterBoundedContexts(): void {
    console.log('[AppContainer] Discovering bounded contexts...');

    // Get all bounded context providers (auto-discovered)
    const providers = AppContainer.resolveBoundedContextProviders();

    // Register each provider (like Laravel's $provider::create($app)->register())
    for (const provider of providers) {
      console.log(`[AppContainer] Registering ${provider.getContextName()} bounded context...`);
      provider.register(container);
      AppContainer.boundedContextProviders.push(provider);
    }

    console.log(`[AppContainer] ${providers.length} bounded contexts registered`);
  }

  /**
   * Resolve bounded context providers
   * Similar to Laravel's resolveDDDProviders()
   * 
   * In Laravel:
   *   foreach (['Backoffice', 'CRM'] as $dir) {
   *     $providerClass = "App\\DDD\\{$dir}\\...\\LaravelServiceProvider";
   *     if (class_exists($providerClass)) $result[] = $providerClass;
   *   }
   */
  private static resolveBoundedContextProviders(): BoundedContextProvider[] {
    const providers: BoundedContextProvider[] = [];

    // Manually registered providers (in a real auto-discovery, we'd scan directories)
    // For now, we manually import them, but this could be automated with webpack/vite plugins
    const providerFactories: ProviderFactory[] = [
      createUserProvider,
      createDeviceProvider,
      createCustomerProvider,
      createMonitoringProvider,
      createNotificationProvider,
    ];

    for (const factory of providerFactories) {
      try {
        const provider = factory();
        providers.push(provider);
      } catch (error) {
        console.warn(`[AppContainer] Failed to create provider:`, error);
      }
    }

    return providers;
  }

  /**
   * Bootstrap all bounded context providers
   * Similar to Laravel's ServiceProvider::boot()
   * 
   * Should be called after all services are registered
   */
  static boot(): void {
    console.log('[AppContainer] Bootstrapping bounded contexts...');
    
    for (const provider of AppContainer.boundedContextProviders) {
      if (provider.boot) {
        provider.boot(container);
      }
    }

    console.log('[AppContainer] All bounded contexts bootstrapped');
  }

  /**
   * Resolve a service from the container
   * Similar to Laravel's app()->make() or app(ServiceInterface::class)
   */
  static resolve<T>(token: string): T {
    if (!AppContainer.initialized) {
      AppContainer.initialize();
    }
    return container.resolve<T>(token);
  }

  /**
   * Get all registered bounded context providers.
   */
  static getProviders(): BoundedContextProvider[] {
    return AppContainer.boundedContextProviders;
  }

  /**
   * Get the DI container instance
   */
  static getContainer(): DependencyContainer {
    if (!AppContainer.initialized) {
      AppContainer.initialize();
    }
    return container;
  }

  /**
   * Reset the container (useful for testing)
   */
  static reset(): void {
    container.clearInstances();
    AppContainer.initialized = false;
    AppContainer.boundedContextProviders = [];
    console.log('[AppContainer] Container reset');
  }
}
