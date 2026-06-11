import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider, HandlerRegistrationContext} from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {MetricsRepository} from '@iotpilot/core/device/domain/interfaces/metrics-repository.interface';
import {DeviceCommandRepository} from '@iotpilot/core/device/domain/interfaces/device-command-repository.interface';
import {PrismaDeviceRepository} from '@iotpilot/core/device/infrastructure/repositories/prisma-device.repository';
import {PrismaDeviceMetricsRepository} from '@iotpilot/core/device/infrastructure/repositories/prisma-device-metrics.repository';
import {PrismaDeviceCommandRepository} from '@iotpilot/core/device/infrastructure/repositories/prisma-device-command.repository';
import {PrismaDeviceRemover} from '@iotpilot/core/device/infrastructure/services/prisma-device-remover.service';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

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
    if (typeof (globalThis as any).window === 'undefined') {
      try {
        const { NodeSSHConnectorService } = require('@iotpilot/core/device/infrastructure/services/node-ssh-connector.service');
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

  registerHandlers(ctx: HandlerRegistrationContext): void {
    const {commandBus, queryBus, eventBus, container} = ctx;

    const {ActivateDeviceCommand} = require('@iotpilot/core/device/application/commands/activate-device/activate-device.command');
    const {ActivateDeviceHandler} = require('@iotpilot/core/device/application/commands/activate-device/activate-device.handler');
    const {DeactivateDeviceCommand} = require('@iotpilot/core/device/application/commands/deactivate-device/deactivate-device.command');
    const {DeactivateDeviceHandler} = require('@iotpilot/core/device/application/commands/deactivate-device/deactivate-device.handler');
    const {SearchDevicesQuery} = require('@iotpilot/core/device/application/queries/search-devices/search-devices.query');
    const {SearchDevicesHandler} = require('@iotpilot/core/device/application/queries/search-devices/search-devices.handler');
    const {ListDevicesQuery} = require('@iotpilot/core/device/application/queries/list-devices/list-devices.query');
    const {ListDevicesHandler} = require('@iotpilot/core/device/application/queries/list-devices/list-devices.handler');
    const {GetDeviceQuery} = require('@iotpilot/core/device/application/queries/get-device/get-device.query');
    const {GetDeviceHandler} = require('@iotpilot/core/device/application/queries/get-device/get-device.handler');
    const {GetDeviceStatusQuery} = require('@iotpilot/core/device/application/queries/get-device-status/get-device-status.query');
    const {GetDeviceStatusHandler} = require('@iotpilot/core/device/application/queries/get-device-status/get-device-status.handler');
    const {GetDeviceMetricsQuery} = require('@iotpilot/core/device/application/queries/get-device-metrics/get-device-metrics.query');
    const {GetDeviceMetricsHandler} = require('@iotpilot/core/device/application/queries/get-device-metrics/get-device-metrics.handler');
    const {RegisterDeviceCommand} = require('@iotpilot/core/device/application/commands/register-device/register-device.command');
    const {RegisterDeviceHandler} = require('@iotpilot/core/device/application/commands/register-device/register-device.handler');
    const {RegisterDeviceCompleteCommand} = require('@iotpilot/core/device/application/commands/register-device-complete/register-device-complete.command');
    const {RegisterDeviceCompleteHandler} = require('@iotpilot/core/device/application/commands/register-device-complete/register-device-complete.handler');
    const {UpdateDeviceCommand} = require('@iotpilot/core/device/application/commands/update-device/update-device.command');
    const {UpdateDeviceHandler} = require('@iotpilot/core/device/application/commands/update-device/update-device.handler');
    const {RemoveDeviceCommand} = require('@iotpilot/core/device/application/commands/remove-device/remove-device.command');
    const {RemoveDeviceHandler} = require('@iotpilot/core/device/application/commands/remove-device/remove-device.handler');
    const {BulkRegisterDevicesCommand} = require('@iotpilot/core/device/application/commands/bulk-register-devices/bulk-register-devices.command');
    const {BulkRegisterDevicesHandler} = require('@iotpilot/core/device/application/commands/bulk-register-devices/bulk-register-devices.handler');
    const {ProcessHeartbeatCommand} = require('@iotpilot/core/device/application/commands/process-heartbeat/process-heartbeat.command');
    const {ProcessHeartbeatHandler} = require('@iotpilot/core/device/application/commands/process-heartbeat/process-heartbeat.handler');
    const {RecordSensorReadingCommand} = require('@iotpilot/core/device/application/commands/record-sensor-reading/record-sensor-reading.command');
    const {RecordSensorReadingHandler} = require('@iotpilot/core/device/application/commands/record-sensor-reading/record-sensor-reading.handler');
    const {ClaimDeviceCommand} = require('@iotpilot/core/device/application/commands/claim-device/claim-device.command');
    const {ClaimDeviceHandler} = require('@iotpilot/core/device/application/commands/claim-device/claim-device.handler');
    const {ProvisionDeviceCommand} = require('@iotpilot/core/device/application/commands/provision-device/provision-device.command');
    const {ProvisionDeviceHandler} = require('@iotpilot/core/device/application/commands/provision-device/provision-device.handler');
    const {MarkStaleDevicesOfflineCommand} = require('@iotpilot/core/device/application/commands/mark-stale-devices-offline/mark-stale-devices-offline.command');
    const {MarkStaleDevicesOfflineHandler} = require('@iotpilot/core/device/application/commands/mark-stale-devices-offline/mark-stale-devices-offline.handler');
    const {GetDeviceCommandQuery} = require('@iotpilot/core/device/application/queries/get-device-command/get-device-command.query');
    const {GetDeviceCommandHandler} = require('@iotpilot/core/device/application/queries/get-device-command/get-device-command.handler');
    const {GetSystemHealthQuery} = require('@iotpilot/core/shared/application/queries/get-system-health/get-system-health.query');
    const {GetSystemHealthHandler} = require('@iotpilot/core/shared/application/queries/get-system-health/get-system-health.handler');
    const {StructuredLogger} = require('@iotpilot/core/shared/infrastructure/logging/structured-logger');

    const deviceRepo = container.resolve('DeviceRepository');
    const deviceRemover = container.resolve('PrismaDeviceRemover');
    const metricsRepo = container.resolve('MetricsRepository');
    const cryptoService = container.resolve('CryptoService');
    const prisma = container.resolve('PrismaService');
    const logger = StructuredLogger.forService('device-handlers');

    // Queries
    queryBus.register(ListDevicesQuery, new ListDevicesHandler(deviceRepo));
    queryBus.register(SearchDevicesQuery, new SearchDevicesHandler(deviceRepo));
    queryBus.register(GetDeviceQuery, new GetDeviceHandler(deviceRepo));
    queryBus.register(GetDeviceStatusQuery, new GetDeviceStatusHandler(deviceRepo));
    queryBus.register(GetDeviceMetricsQuery, new GetDeviceMetricsHandler(deviceRepo, metricsRepo));
    queryBus.register(GetDeviceCommandQuery, new GetDeviceCommandHandler(prisma));
    queryBus.register(GetSystemHealthQuery, new GetSystemHealthHandler(prisma));

    // Commands
    commandBus.register(ActivateDeviceCommand, new ActivateDeviceHandler(deviceRepo, logger, eventBus));
    commandBus.register(DeactivateDeviceCommand, new DeactivateDeviceHandler(deviceRepo, logger, eventBus));
    commandBus.register(RegisterDeviceCommand, new RegisterDeviceHandler(deviceRepo, logger));
    commandBus.register(RegisterDeviceCompleteCommand, new RegisterDeviceCompleteHandler(deviceRepo, prisma));
    commandBus.register(UpdateDeviceCommand, new UpdateDeviceHandler(deviceRepo, logger, eventBus));
    commandBus.register(RemoveDeviceCommand, new RemoveDeviceHandler(deviceRemover, deviceRepo, eventBus));
    commandBus.register(BulkRegisterDevicesCommand, new BulkRegisterDevicesHandler(deviceRepo, logger, cryptoService));
    commandBus.register(ProcessHeartbeatCommand, new ProcessHeartbeatHandler(prisma, eventBus));
    commandBus.register(RecordSensorReadingCommand, new RecordSensorReadingHandler(prisma));
    commandBus.register(ClaimDeviceCommand, new ClaimDeviceHandler(prisma));
    commandBus.register(ProvisionDeviceCommand, new ProvisionDeviceHandler(prisma));
    commandBus.register(MarkStaleDevicesOfflineCommand, new MarkStaleDevicesOfflineHandler(prisma));

    // SSH — server-side only to avoid bundling ssh2 in client
    if (typeof (globalThis as any).window === 'undefined') {
      try {
        const {ExecuteSSHCommand} = require('@iotpilot/core/device/application/commands/execute-ssh-command/execute-ssh-command.command');
        const {ExecuteSSHCommandHandler} = require('@iotpilot/core/device/application/commands/execute-ssh-command/execute-ssh-command.handler');
        const sshConnector = container.resolve('NodeSSHConnectorService');
        commandBus.register(ExecuteSSHCommand, new ExecuteSSHCommandHandler(sshConnector, deviceRepo, eventBus));
      } catch {
        console.warn('[DeviceProvider] SSH handler not registered (ssh2 module not loaded)');
      }
    }
  }

  boot?(container: DependencyContainer): void {
    console.log('[DeviceProvider] Device bounded context registered');
  }
}

// Factory function (like Laravel's ::create())
export const createDeviceProvider = (): BoundedContextProvider => {
  return new DeviceServiceProvider();
};
