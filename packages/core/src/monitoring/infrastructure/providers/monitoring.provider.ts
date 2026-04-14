import {DependencyContainer} from 'tsyringe';
import {BoundedContextProvider, HandlerRegistrationContext} from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import {TenantScopedLoggingService} from '@iotpilot/core/shared/infrastructure/logging/tenant-scoped-logging.service';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import {prisma} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {PrismaAlertRepository} from '../repositories/prisma-alert.repository';
import {PrismaThresholdRepository} from '../repositories/prisma-threshold.repository';
import {NoopMonitoringMetricsRepository} from '../repositories/noop-metrics.repository';

export class MonitoringServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Monitoring';
  }

  register(container: DependencyContainer): void {
    container.register<TenantScopedLoggingService>('TenantScopedLoggingService', {
      useFactory: () => new TenantScopedLoggingService()
    });

    container.register<TenantBoundaryValidator>('TenantBoundaryValidator', {
      useFactory: (c: DependencyContainer) => {
        const loggingService = c.resolve<TenantScopedLoggingService>('TenantScopedLoggingService');
        return new TenantBoundaryValidator(loggingService);
      }
    });
  }

  registerHandlers(ctx: HandlerRegistrationContext): void {
    const {commandBus, queryBus, container} = ctx;

    const {GetSystemMetricsQuery} = require('@iotpilot/core/monitoring/application/queries/get-system-metrics/get-system-metrics.query');
    const {GetSystemMetricsHandler} = require('@iotpilot/core/monitoring/application/queries/get-system-metrics/get-system-metrics.handler');
    const {ListAlertsQuery} = require('@iotpilot/core/monitoring/application/queries/list-alerts/list-alerts.query');
    const {ListAlertsHandler} = require('@iotpilot/core/monitoring/application/queries/list-alerts/list-alerts.handler');
    const {GetAlertDetailsQuery} = require('@iotpilot/core/monitoring/application/queries/get-alert-details/get-alert-details.query');
    const {GetAlertDetailsHandler} = require('@iotpilot/core/monitoring/application/queries/get-alert-details/get-alert-details.handler');
    const {AcknowledgeAlertCommand} = require('@iotpilot/core/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command');
    const {AcknowledgeAlertHandler} = require('@iotpilot/core/monitoring/application/commands/acknowledge-alert/acknowledge-alert.handler');
    const {CreateAlertCommand} = require('@iotpilot/core/monitoring/application/commands/create-alert/create-alert.command');
    const {CreateAlertHandler} = require('@iotpilot/core/monitoring/application/commands/create-alert/create-alert.handler');
    const {ResolveAlertCommand} = require('@iotpilot/core/monitoring/application/commands/resolve-alert/resolve-alert.command');
    const {ResolveAlertHandler} = require('@iotpilot/core/monitoring/application/commands/resolve-alert/resolve-alert.handler');
    const {DeleteAlertCommand} = require('@iotpilot/core/monitoring/application/commands/delete-alert/delete-alert.command');
    const {DeleteAlertHandler} = require('@iotpilot/core/monitoring/application/commands/delete-alert/delete-alert.handler');
    const {AlertCreator} = require('@iotpilot/core/monitoring/domain/services/alert-creator.service');
    const {GetThresholdsQuery} = require('@iotpilot/core/monitoring/application/queries/get-thresholds/get-thresholds.query');
    const {GetThresholdsHandler} = require('@iotpilot/core/monitoring/application/queries/get-thresholds/get-thresholds.handler');
    const {CreateThresholdCommand} = require('@iotpilot/core/monitoring/application/commands/create-threshold/create-threshold.command');
    const {CreateThresholdHandler} = require('@iotpilot/core/monitoring/application/commands/create-threshold/create-threshold.handler');
    const {UpdateThresholdCommand} = require('@iotpilot/core/monitoring/application/commands/update-threshold/update-threshold.command');
    const {UpdateThresholdHandler} = require('@iotpilot/core/monitoring/application/commands/update-threshold/update-threshold.handler');
    const {GenerateReportQuery} = require('@iotpilot/core/monitoring/application/queries/generate-report/generate-report.query');
    const {GenerateReportHandler} = require('@iotpilot/core/monitoring/application/queries/generate-report/generate-report.handler');

    const tenantValidator = container.resolve<TenantBoundaryValidator>('TenantBoundaryValidator');
    const alertRepo = new PrismaAlertRepository(prisma, tenantValidator);
    const metricsRepo = new NoopMonitoringMetricsRepository();
    const thresholdRepo = new PrismaThresholdRepository(prisma, tenantValidator);
    const alertCreator = new AlertCreator();

    queryBus.register(GetSystemMetricsQuery, new GetSystemMetricsHandler(metricsRepo, tenantValidator));
    queryBus.register(ListAlertsQuery, new ListAlertsHandler(alertRepo, tenantValidator));
    queryBus.register(GetAlertDetailsQuery, new GetAlertDetailsHandler(alertRepo, metricsRepo, thresholdRepo, tenantValidator));

    commandBus.register(AcknowledgeAlertCommand, new AcknowledgeAlertHandler(alertRepo, ctx.eventBus));
    commandBus.register(CreateAlertCommand, new CreateAlertHandler(alertCreator, alertRepo, ctx.eventBus));
    commandBus.register(ResolveAlertCommand, new ResolveAlertHandler(alertRepo, ctx.eventBus));
    commandBus.register(DeleteAlertCommand, new DeleteAlertHandler(alertRepo, ctx.eventBus));

    queryBus.register(GetThresholdsQuery, new GetThresholdsHandler(thresholdRepo, tenantValidator));
    commandBus.register(CreateThresholdCommand, new CreateThresholdHandler(thresholdRepo, ctx.eventBus));
    commandBus.register(UpdateThresholdCommand, new UpdateThresholdHandler(thresholdRepo, ctx.eventBus));
    queryBus.register(GenerateReportQuery, new GenerateReportHandler(metricsRepo, alertRepo, thresholdRepo, tenantValidator, ctx.eventBus));
  }

  boot?(container: DependencyContainer): void {
    console.log('[MonitoringProvider] Monitoring bounded context registered');
  }
}

export const createMonitoringProvider = (): BoundedContextProvider => {
  return new MonitoringServiceProvider();
};
