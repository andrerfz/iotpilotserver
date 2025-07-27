import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider} from '@/lib/shared/infrastructure/container/bounded-context-provider.interface';
import {TenantScopedLoggingService} from '@/lib/shared/infrastructure/logging/tenant-scoped-logging.service';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';

/**
 * Monitoring Bounded Context Service Provider
 * Registers all monitoring-related dependencies
 */
export class MonitoringServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Monitoring';
  }

  register(container: DependencyContainer): void {
    // Register TenantScopedLoggingService using factory (avoids NestJS decorator issues)
    container.register<TenantScopedLoggingService>('TenantScopedLoggingService', {
      useFactory: () => new TenantScopedLoggingService()
    });

    // Register TenantBoundaryValidator using factory (depends on TenantScopedLoggingService)
    container.register<TenantBoundaryValidator>('TenantBoundaryValidator', {
      useFactory: (c: DependencyContainer) => {
        const loggingService = c.resolve<TenantScopedLoggingService>('TenantScopedLoggingService');
        return new TenantBoundaryValidator(loggingService);
      }
    });

    // TODO: Add Alert, Threshold, Metrics repositories when they're ready
  }

  boot?(container: DependencyContainer): void {
    console.log('[MonitoringProvider] Monitoring bounded context registered');
  }
}

// Factory function
export const createMonitoringProvider = (): BoundedContextProvider => {
  return new MonitoringServiceProvider();
};
