import {InMemoryQueryBus} from '@iotpilot/core/shared/application/bus/query.bus';
import {InMemoryCommandBus} from '@iotpilot/core/shared/application/bus/command.bus';
import {InMemoryEventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {prisma as prismaServiceInstance, PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {AppContainer} from './app-container';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {UserRepository} from '@iotpilot/core/user/domain/interfaces/user-repository.interface';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceCommandRepository} from '@iotpilot/core/device/domain/interfaces/device-command-repository.interface';
import type {JobQueue} from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

/**
 * Service container for managing dependencies in the DDD architecture.
 *
 * Handler registration is delegated to each bounded context's provider
 * via registerHandlers(). Adding a new command/query handler only requires
 * editing the relevant provider — this file does not need to change.
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private queryBus: InMemoryQueryBus;
  private commandBus: InMemoryCommandBus;
  private eventBus: InMemoryEventBus;
  private prismaClient: PrismaService;
  private logger: StructuredLogger;

  private constructor() {
    this.prismaClient = prismaServiceInstance;
    this.logger = StructuredLogger.forService('service-container');
    this.queryBus = new InMemoryQueryBus();
    this.commandBus = new InMemoryCommandBus();
    this.eventBus = new InMemoryEventBus();
    this.registerHandlers();
    this.registerEventHandlers();
    this.startCommandQueueProcessor();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Delegates handler registration to each bounded context provider.
   * Each provider owns its own command/query → handler wiring.
   */
  private registerHandlers(): void {
    AppContainer.initialize();

    const container = AppContainer.getContainer();
    const ctx = {
      commandBus: this.commandBus,
      queryBus: this.queryBus,
      eventBus: this.eventBus,
      container,
    };

    for (const provider of AppContainer.getProviders()) {
      try {
        if (provider.registerHandlers) {
          provider.registerHandlers(ctx);
          this.logger.info(`[${provider.getContextName()}] handlers registered`);
        }
      } catch (error) {
        this.logger.error(
          `[${provider.getContextName()}] handler registration failed`,
          { name: (error as Error)?.name, message: (error as Error)?.message },
          error as Error
        );
      }
    }
  }

  /**
   * Register domain event handlers that dispatch to the BullMQ job queue.
   * Server-side only — event handlers are not needed in the browser.
   */
  private registerEventHandlers(): void {
    if (typeof (globalThis as any).window !== 'undefined') return;

    try {
      const jobQueue = AppContainer.resolve<JobQueue>('JobQueue');

      const { OnDeviceRegisteredHandler } = require('@iotpilot/core/device/application/event-handlers/on-device-registered.handler');
      const { OnDeviceDisconnectedHandler } = require('@iotpilot/core/device/application/event-handlers/on-device-disconnected.handler');
      const { OnMetricsCollectedHandler } = require('@iotpilot/core/device/application/event-handlers/on-metrics-collected.handler');
      const { OnAlertTriggeredHandler } = require('@iotpilot/core/notification/application/event-handlers/on-alert-triggered.handler');
      const { OnAlertResolvedHandler } = require('@iotpilot/core/notification/application/event-handlers/on-alert-resolved.handler');
      const { OnDeviceOfflineHandler } = require('@iotpilot/core/notification/application/event-handlers/on-device-offline.handler');
      const { OnDeviceOnlineHandler } = require('@iotpilot/core/notification/application/event-handlers/on-device-online.handler');
      const { OnNotificationDispatchedHandler } = require('@iotpilot/core/notification/application/event-handlers/on-notification-dispatched.handler');
      const { OnUserAuthenticatedHandler } = require('@iotpilot/core/notification/application/event-handlers/on-user-authenticated.handler');

      const notificationCommandBus = this.commandBus;
      const routingService = AppContainer.resolve('NotificationRoutingService');

      this.eventBus.subscribe('DeviceRegisteredEvent', new OnDeviceRegisteredHandler(jobQueue));
      this.eventBus.subscribe('DeviceDisconnectedEvent', new OnDeviceDisconnectedHandler(jobQueue));
      this.eventBus.subscribe('MetricsCollectedEvent', new OnMetricsCollectedHandler(jobQueue));
      this.eventBus.subscribe('AlertTriggeredEvent', new OnAlertTriggeredHandler(notificationCommandBus, routingService));
      this.eventBus.subscribe('AlertResolvedEvent', new OnAlertResolvedHandler(notificationCommandBus, routingService));
      this.eventBus.subscribe('DeviceDisconnectedEvent', new OnDeviceOfflineHandler(notificationCommandBus, routingService));
      this.eventBus.subscribe('DeviceConnectedEvent', new OnDeviceOnlineHandler(notificationCommandBus, routingService));
      this.eventBus.subscribe('NotificationDispatchedEvent', new OnNotificationDispatchedHandler(jobQueue));
      this.eventBus.subscribe('UserAuthenticatedEvent', new OnUserAuthenticatedHandler(notificationCommandBus, routingService));

      this.logger.info('[ServiceContainer] 9 domain event handlers registered');
    } catch (error) {
      console.warn('[ServiceContainer] Event handlers not available:', (error as Error).message);
    }
  }

  /**
   * Starts the background loop that processes queued commands for devices
   * that were offline when a command was submitted. Runs every 60s.
   * Server-side only — noop in the browser or during SSR.
   */
  private startCommandQueueProcessor(): void {
    if (typeof (globalThis as any).window !== 'undefined') return;
    try {
      const deviceRepo = AppContainer.resolve<DeviceRepository>('DeviceRepository');
      const commandRepo = AppContainer.resolve<DeviceCommandRepository>('DeviceCommandRepository');
      const { CommandQueueService } = require('@iotpilot/core/device/application/services/command-queue.service');
      CommandQueueService.getInstance(deviceRepo, commandRepo).startQueueProcessing(60000);
      console.log('[ServiceContainer] Command queue processor started (60s interval)');
    } catch (error) {
      console.warn('[ServiceContainer] Command queue processor not started:', (error as Error).message);
    }
  }

  public getQueryBus(): InMemoryQueryBus {
    return this.queryBus;
  }

  public getCommandBus(): InMemoryCommandBus {
    return this.commandBus;
  }

  public getEventBus(): InMemoryEventBus {
    return this.eventBus;
  }

  public getPrismaClient(): PrismaService {
    return this.prismaClient;
  }

  public getUserRepository() {
    return AppContainer.resolve<UserRepository>('UserRepository');
  }

  public getDeviceRepository() {
    return AppContainer.resolve<DeviceRepository>('DeviceRepository');
  }

  public getDeviceCommandRepository() {
    return AppContainer.resolve<DeviceCommandRepository>('DeviceCommandRepository');
  }

  public async dispose(): Promise<void> {
    await this.prismaClient.close();
  }
}
