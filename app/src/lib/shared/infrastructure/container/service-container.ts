import {InMemoryQueryBus} from '@/lib/shared/application/bus/query.bus';
import {InMemoryCommandBus} from '@/lib/shared/application/bus/command.bus';
import {InMemoryEventBus} from '@/lib/shared/application/bus/event.bus';

// User Domain
import {ValidateSessionQuery} from '@/lib/user/application/queries/validate-session/validate-session.query';
import {ValidateSessionHandler} from '@/lib/user/application/queries/validate-session/validate-session.handler';
import {AuthenticateUserCommand} from '@/lib/user/application/commands/authenticate-user/authenticate-user.command';
import {AuthenticateUserHandler} from '@/lib/user/application/commands/authenticate-user/authenticate-user.handler';
import {RegisterUserCommand} from '@/lib/user/application/commands/register-user/register-user.command';
import {RegisterUserHandler} from '@/lib/user/application/commands/register-user/register-user.handler';
import {GetCurrentUserQuery} from '@/lib/user/application/queries/get-current-user/get-current-user.query';
import {GetCurrentUserHandler} from '@/lib/user/application/queries/get-current-user/get-current-user.handler';
import {LogoutUserCommand} from '@/lib/user/application/commands/logout-user/logout-user.command';
import {LogoutUserHandler} from '@/lib/user/application/commands/logout-user/logout-user.handler';
import {RefreshSessionCommand} from '@/lib/user/application/commands/refresh-session/refresh-session.command';
import {RefreshSessionHandler} from '@/lib/user/application/commands/refresh-session/refresh-session.handler';
import {ListApiKeysQuery} from '@/lib/user/application/queries/list-api-keys/list-api-keys.query';
import {ListApiKeysHandler} from '@/lib/user/application/queries/list-api-keys/list-api-keys.handler';
import {CreateApiKeyCommand} from '@/lib/user/application/commands/create-api-key/create-api-key.command';
import {CreateApiKeyHandler} from '@/lib/user/application/commands/create-api-key/create-api-key.handler';
import {UserSessionService} from '@/lib/user/infrastructure/services/user-session.service';
import {prisma as prismaServiceInstance, PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {AppContainer} from './app-container';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';

// Device Domain
import {ListDevicesQuery} from '@/lib/device/application/queries/list-devices/list-devices.query';
import {ListDevicesHandler} from '@/lib/device/application/queries/list-devices/list-devices.handler';
import {GetDeviceQuery} from '@/lib/device/application/queries/get-device/get-device.query';
import {GetDeviceHandler} from '@/lib/device/application/queries/get-device/get-device.handler';
import {GetDeviceStatusQuery} from '@/lib/device/application/queries/get-device-status/get-device-status.query';
import {GetDeviceStatusHandler} from '@/lib/device/application/queries/get-device-status/get-device-status.handler';
import {GetDeviceMetricsQuery} from '@/lib/device/application/queries/get-device-metrics/get-device-metrics.query';
import {GetDeviceMetricsHandler} from '@/lib/device/application/queries/get-device-metrics/get-device-metrics.handler';
import {ExecuteSSHCommand} from '@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.command';
// Lazy-loaded to avoid bundling SSH2 in client-side code
// import { ExecuteSSHCommandHandler } from '@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.handler';
import {RegisterDeviceCommand} from '@/lib/device/application/commands/register-device/register-device.command';
import {RegisterDeviceHandler} from '@/lib/device/application/commands/register-device/register-device.handler';
import {
    RegisterDeviceCompleteCommand
} from '@/lib/device/application/commands/register-device-complete/register-device-complete.command';
import {
    RegisterDeviceCompleteHandler
} from '@/lib/device/application/commands/register-device-complete/register-device-complete.handler';
import {UpdateDeviceCommand} from '@/lib/device/application/commands/update-device/update-device.command';
import {UpdateDeviceHandler} from '@/lib/device/application/commands/update-device/update-device.handler';
import {RemoveDeviceCommand} from '@/lib/device/application/commands/remove-device/remove-device.command';
import {RemoveDeviceHandler} from '@/lib/device/application/commands/remove-device/remove-device.handler';
import {
    BulkRegisterDevicesCommand
} from '@/lib/device/application/commands/bulk-register-devices/bulk-register-devices.command';
import {
    BulkRegisterDevicesHandler
} from '@/lib/device/application/commands/bulk-register-devices/bulk-register-devices.handler';
import {ProcessHeartbeatCommand} from '@/lib/device/application/commands/process-heartbeat/process-heartbeat.command';
import {ProcessHeartbeatHandler} from '@/lib/device/application/commands/process-heartbeat/process-heartbeat.handler';
import {GetDeviceCommandQuery} from '@/lib/device/application/queries/get-device-command/get-device-command.query';
import {GetDeviceCommandHandler} from '@/lib/device/application/queries/get-device-command/get-device-command.handler';
import {GetSystemHealthQuery} from '@/lib/shared/application/queries/get-system-health/get-system-health.query';
import {GetSystemHealthHandler} from '@/lib/shared/application/queries/get-system-health/get-system-health.handler';
// Lazy-loaded to avoid bundling SSH2 in client-side code
// import { NodeSSHConnectorService } from '@/lib/device/infrastructure/services/node-ssh-connector.service';
import {PrismaDeviceRemover} from '@/lib/device/infrastructure/services/prisma-device-remover.service';

// Monitoring Domain
import {GetSystemMetricsQuery} from '@/lib/monitoring/application/queries/get-system-metrics/get-system-metrics.query';
import {
    GetSystemMetricsHandler
} from '@/lib/monitoring/application/queries/get-system-metrics/get-system-metrics.handler';
import {
    AcknowledgeAlertCommand
} from '@/lib/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command';
import {
    AcknowledgeAlertHandler
} from '@/lib/monitoring/application/commands/acknowledge-alert/acknowledge-alert.handler';
import {NoopMonitoringMetricsRepository} from '@/lib/monitoring/infrastructure/repositories/noop-metrics.repository';
import {NoopAlertRepository} from '@/lib/monitoring/infrastructure/repositories/noop-alert.repository';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import {TenantScopedLoggingService} from '@/lib/shared/infrastructure/logging/tenant-scoped-logging.service';

// Customer Domain
import {
    GetCustomerByDomainQuery
} from '@/lib/customer/application/queries/get-customer-by-domain/get-customer-by-domain.query';
import {
    GetCustomerByDomainHandler
} from '@/lib/customer/application/queries/get-customer-by-domain/get-customer-by-domain.handler';
import {CreateCustomerCommand} from '@/lib/customer/application/commands/create-customer/create-customer.command';
import {CreateCustomerHandler} from '@/lib/customer/application/commands/create-customer/create-customer.handler';

// Infrastructure
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device.repository';
import {MetricsRepository} from '@/lib/device/domain/interfaces/metrics-repository.interface';
import {DeviceCommandRepository} from '@/lib/device/domain/interfaces/device-command-repository.interface';
import {ApiKeyRepository} from '@/lib/user/domain/interfaces/api-key-repository.interface';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';

/**
 * Service container for managing dependencies in the DDD architecture
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
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  private registerHandlers(): void {
    // Initialize DI container (like Laravel's service providers)
    AppContainer.initialize();

    // Automatic dependency resolution! No manual creation needed!
    // Like Laravel: $userRepo = app()->make(UserRepositoryInterface::class);
    const userRepository = AppContainer.resolve<UserRepository>('UserRepository');
    const sessionRepository = AppContainer.resolve<SessionRepository>('SessionRepository');
    const apiKeyRepository = AppContainer.resolve<ApiKeyRepository>('ApiKeyRepository');
    const userAuthenticator = AppContainer.resolve<UserAuthenticator>('UserAuthenticator');
    const sessionService = AppContainer.resolve<UserSessionService>('UserSessionService');
    const cryptoService = AppContainer.resolve<CryptoService>('CryptoService');

    // Register User Domain handlers
    this.queryBus.register(ValidateSessionQuery as any, new ValidateSessionHandler(sessionRepository as any, userRepository));
    this.commandBus.register(AuthenticateUserCommand as any, new AuthenticateUserHandler(userAuthenticator, sessionService as any));
    this.commandBus.register(RegisterUserCommand as any, new RegisterUserHandler(userRepository, this.logger));

    // Register additional user handlers
    this.queryBus.register(GetCurrentUserQuery as any, new GetCurrentUserHandler(userRepository));
    this.commandBus.register(LogoutUserCommand as any, new LogoutUserHandler(sessionRepository as any, this.eventBus));
    this.commandBus.register(RefreshSessionCommand as any, new RefreshSessionHandler(sessionRepository as any, userRepository, this.eventBus));

    // Register API Key handlers
    this.queryBus.register(ListApiKeysQuery as any, new ListApiKeysHandler(apiKeyRepository));
    this.commandBus.register(CreateApiKeyCommand as any, new CreateApiKeyHandler(apiKeyRepository, cryptoService));

    try {
      // Automatic resolution - DeviceRepository automatically gets MetricsRepository!
      const deviceRepository = AppContainer.resolve<DeviceRepository>('DeviceRepository');
      const deviceRemover = AppContainer.resolve<PrismaDeviceRemover>('PrismaDeviceRemover');
      const metricsRepository = AppContainer.resolve<MetricsRepository>('MetricsRepository');

      // Queries
      this.queryBus.register(ListDevicesQuery as any, new ListDevicesHandler(deviceRepository));
      this.queryBus.register(GetDeviceQuery as any, new GetDeviceHandler(deviceRepository as any));
      this.queryBus.register(GetDeviceStatusQuery as any, new GetDeviceStatusHandler(deviceRepository));
      this.queryBus.register(GetDeviceMetricsQuery as any, new GetDeviceMetricsHandler(deviceRepository as any, metricsRepository));

      // Commands (non-SSH)
      this.commandBus.register(RegisterDeviceCommand as any, new RegisterDeviceHandler(deviceRepository, this.logger));
      this.commandBus.register(RegisterDeviceCompleteCommand as any, new RegisterDeviceCompleteHandler(deviceRepository as any, this.prismaClient));
      this.commandBus.register(UpdateDeviceCommand as any, new UpdateDeviceHandler(deviceRepository, this.logger));
      this.commandBus.register(RemoveDeviceCommand as any, new RemoveDeviceHandler(deviceRemover as any, deviceRepository as any, this.eventBus));
      this.commandBus.register(BulkRegisterDevicesCommand as any, new BulkRegisterDevicesHandler(deviceRepository, this.logger, cryptoService));

      // SSH Command - Lazy registration (only when server-side SSH is available)
      // This prevents webpack from bundling SSH2 native modules for client-side
      if (typeof window === 'undefined') {
        try {
          const { ExecuteSSHCommandHandler } = require('@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.handler');
          const sshConnector = AppContainer.resolve('NodeSSHConnectorService');
          this.commandBus.register(ExecuteSSHCommand as any, new ExecuteSSHCommandHandler(sshConnector as any, deviceRepository as any, this.eventBus));
        } catch (e) {
          console.warn('SSH connector not available, ExecuteSSHCommand handler not registered');
        }
      }
      
      // Register ProcessHeartbeatCommand handler with PrismaService injection
      this.commandBus.register(ProcessHeartbeatCommand as any, new ProcessHeartbeatHandler(this.prismaClient));
      
      // Register GetDeviceCommandQuery handler
      this.queryBus.register(GetDeviceCommandQuery as any, new GetDeviceCommandHandler(this.prismaClient));
      
      // Register GetSystemHealthQuery handler (shared domain)
      this.queryBus.register(GetSystemHealthQuery as any, new GetSystemHealthHandler(this.prismaClient));
    } catch (error) {
      console.warn('Device handlers not available:', error);
    }

    // Register Monitoring Domain handlers (if available)
    try {
      const tenantLogging = AppContainer.resolve<TenantScopedLoggingService>('TenantScopedLoggingService');
      const tenantValidator = AppContainer.resolve<TenantBoundaryValidator>('TenantBoundaryValidator');

      // NOTE: these are intentionally no-op implementations for now; they live in infrastructure
      // so the ServiceContainer remains composition-only (no inline stubs).
      const metricsRepository = new NoopMonitoringMetricsRepository();
      const alertRepository = new NoopAlertRepository();

      this.queryBus.register(GetSystemMetricsQuery as any, new GetSystemMetricsHandler(metricsRepository as any, tenantValidator));
      this.commandBus.register(AcknowledgeAlertCommand as any, new AcknowledgeAlertHandler(alertRepository as any, this.eventBus));
    } catch (error) {
      console.warn('Monitoring handlers not available:', error);
    }

    // Register Customer Domain handlers
    try {
      const customerRepository = AppContainer.resolve<CustomerRepository>('CustomerRepository');
      const getCustomerByDomainHandler = new GetCustomerByDomainHandler(customerRepository);
      this.queryBus.register(GetCustomerByDomainQuery as any, getCustomerByDomainHandler);
      this.commandBus.register(CreateCustomerCommand as any, new CreateCustomerHandler(customerRepository, cryptoService));
    } catch (error) {
      this.logger.error(
        'Customer handlers registration failed',
        { name: (error as any)?.name, message: (error as any)?.message },
        error as Error
      );
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
    // Use DI container for consistency
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