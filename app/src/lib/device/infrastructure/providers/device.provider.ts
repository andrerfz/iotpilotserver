import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider} from '@/lib/shared/infrastructure/container/bounded-context-provider.interface';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device.repository';
import {MetricsRepository} from '@/lib/device/domain/interfaces/metrics-repository.interface';
import {DeviceCommandRepository} from '@/lib/device/domain/interfaces/device-command-repository.interface';
import {PrismaDeviceRepository} from '@/lib/device/infrastructure/repositories/prisma-device.repository';
import {PrismaDeviceMetricsRepository} from '@/lib/device/infrastructure/repositories/prisma-device-metrics.repository';
import {PrismaDeviceCommandRepository} from '@/lib/device/infrastructure/repositories/prisma-device-command.repository';
import {PrismaDeviceRemover} from '@/lib/device/infrastructure/services/prisma-device-remover.service';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

/**
 * Device Bounded Context Service Provider
 * Registers all device-related dependencies
 * 
 * Similar to Laravel's ServiceProvider for Device module
 */
export class DeviceServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Device';
  }

  register(container: DependencyContainer): void {
    // Register MetricsRepository
    container.register<MetricsRepository>('MetricsRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaDeviceMetricsRepository(prisma);
      }
    });

    // Register DeviceRepository (depends on MetricsRepository)
    container.register<DeviceRepository>('DeviceRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        const metricsRepo = c.resolve<MetricsRepository>('MetricsRepository');
        return new PrismaDeviceRepository(prisma, metricsRepo);
      }
    });

    // Register DeviceCommandRepository
    container.register<DeviceCommandRepository>('DeviceCommandRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaDeviceCommandRepository(prisma);
      }
    });

    // Register PrismaDeviceRemover
    container.register<PrismaDeviceRemover>('PrismaDeviceRemover', {
      useFactory: (c: DependencyContainer) => {
        const deviceRepo = c.resolve<DeviceRepository>('DeviceRepository');
        return new PrismaDeviceRemover(deviceRepo);
      }
    });

    // NodeSSHConnectorService - Lazy registration (server-side only)
    if (typeof window === 'undefined') {
      try {
        const { NodeSSHConnectorService } = require('@/lib/device/infrastructure/services/node-ssh-connector.service');
        container.register('NodeSSHConnectorService', {
          useFactory: (c: DependencyContainer) => {
            const deviceRepo = c.resolve<DeviceRepository>('DeviceRepository');
            return new NodeSSHConnectorService(deviceRepo);
          }
        });
      } catch (e) {
        console.warn('[DeviceProvider] SSH connector not available (SSH2 module not loaded)');
      }
    }
  }

  boot?(container: DependencyContainer): void {
    // Bootstrap logic if needed (e.g., event listeners)
    console.log('[DeviceProvider] Device bounded context registered');
  }
}

// Factory function (like Laravel's ::create())
export const createDeviceProvider = (): BoundedContextProvider => {
  return new DeviceServiceProvider();
};
