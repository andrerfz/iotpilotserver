import { DependencyContainer } from 'tsyringe';
import { BoundedContextProvider, HandlerRegistrationContext } from '@iotpilot/core/shared/infrastructure/container/bounded-context-provider.interface';
import { NotificationRecordRepository } from '../../domain/interfaces/notification-record.repository';
import { NotificationPreferenceRepository } from '../../domain/interfaces/notification-preference.repository';
import { PrismaNotificationRecordRepository } from '../repositories/prisma-notification-record.repository';
import { PrismaNotificationPreferenceRepository } from '../repositories/prisma-notification-preference.repository';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

export class NotificationServiceProvider implements BoundedContextProvider {
  getContextName(): string {
    return 'Notification';
  }

  register(container: DependencyContainer): void {
    container.register<NotificationRecordRepository>('NotificationRecordRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaNotificationRecordRepository(prisma);
      },
    });

    container.register<NotificationPreferenceRepository>('NotificationPreferenceRepository', {
      useFactory: (c: DependencyContainer) => {
        const prisma = c.resolve<PrismaService>('PrismaService');
        return new PrismaNotificationPreferenceRepository(prisma);
      },
    });

    container.register<NotificationRoutingService>('NotificationRoutingService', {
      useFactory: (c: DependencyContainer) => {
        const preferenceRepo = c.resolve<NotificationPreferenceRepository>('NotificationPreferenceRepository');
        return new NotificationRoutingService(preferenceRepo);
      },
    });
  }

  registerHandlers(ctx: HandlerRegistrationContext): void {
    const { commandBus, queryBus, container } = ctx;

    const { DispatchNotificationCommand } = require('../../application/commands/dispatch-notification/dispatch-notification.command');
    const { DispatchNotificationHandler } = require('../../application/commands/dispatch-notification/dispatch-notification.handler');
    const { RetryNotificationCommand } = require('../../application/commands/retry-notification/retry-notification.command');
    const { RetryNotificationHandler } = require('../../application/commands/retry-notification/retry-notification.handler');
    const { CancelNotificationCommand } = require('../../application/commands/cancel-notification/cancel-notification.command');
    const { CancelNotificationHandler } = require('../../application/commands/cancel-notification/cancel-notification.handler');
    const { MarkNotificationDeliveredCommand } = require('../../application/commands/mark-notification-delivered/mark-notification-delivered.command');
    const { MarkNotificationDeliveredHandler } = require('../../application/commands/mark-notification-delivered/mark-notification-delivered.handler');
    const { MarkNotificationFailedCommand } = require('../../application/commands/mark-notification-failed/mark-notification-failed.command');
    const { MarkNotificationFailedHandler } = require('../../application/commands/mark-notification-failed/mark-notification-failed.handler');
    const { UpdateNotificationPreferenceCommand } = require('../../application/commands/update-notification-preference/update-notification-preference.command');
    const { UpdateNotificationPreferenceHandler } = require('../../application/commands/update-notification-preference/update-notification-preference.handler');

    const { GetNotificationHistoryQuery } = require('../../application/queries/get-notification-history/get-notification-history.query');
    const { GetNotificationHistoryHandler } = require('../../application/queries/get-notification-history/get-notification-history.handler');
    const { GetNotificationPreferencesQuery } = require('../../application/queries/get-notification-preferences/get-notification-preferences.query');
    const { GetNotificationPreferencesHandler } = require('../../application/queries/get-notification-preferences/get-notification-preferences.handler');
    const { GetNotificationRecordQuery } = require('../../application/queries/get-notification-record/get-notification-record.query');
    const { GetNotificationRecordHandler } = require('../../application/queries/get-notification-record/get-notification-record.handler');

    const recordRepo = container.resolve<NotificationRecordRepository>('NotificationRecordRepository');
    const preferenceRepo = container.resolve<NotificationPreferenceRepository>('NotificationPreferenceRepository');
    const routingService = container.resolve<NotificationRoutingService>('NotificationRoutingService');

    commandBus.register(DispatchNotificationCommand, new DispatchNotificationHandler(recordRepo, ctx.eventBus));
    commandBus.register(RetryNotificationCommand, new RetryNotificationHandler(recordRepo, ctx.eventBus));
    commandBus.register(CancelNotificationCommand, new CancelNotificationHandler(recordRepo, ctx.eventBus));
    commandBus.register(MarkNotificationDeliveredCommand, new MarkNotificationDeliveredHandler(recordRepo, ctx.eventBus));
    commandBus.register(MarkNotificationFailedCommand, new MarkNotificationFailedHandler(recordRepo, ctx.eventBus));
    commandBus.register(UpdateNotificationPreferenceCommand, new UpdateNotificationPreferenceHandler(preferenceRepo, ctx.eventBus));

    queryBus.register(GetNotificationHistoryQuery, new GetNotificationHistoryHandler(recordRepo));
    queryBus.register(GetNotificationPreferencesQuery, new GetNotificationPreferencesHandler(preferenceRepo));
    queryBus.register(GetNotificationRecordQuery, new GetNotificationRecordHandler(recordRepo));
  }

  boot?(container: DependencyContainer): void {
    console.log('[NotificationProvider] Notification bounded context registered');
  }
}

export const createNotificationProvider = (): BoundedContextProvider => {
  return new NotificationServiceProvider();
};
