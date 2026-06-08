import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { GetNotificationHistoryQuery } from '@iotpilot/core/notification/application/queries/get-notification-history/get-notification-history.query';
import { GetNotificationRecordQuery } from '@iotpilot/core/notification/application/queries/get-notification-record/get-notification-record.query';
import { CancelNotificationCommand } from '@iotpilot/core/notification/application/commands/cancel-notification/cancel-notification.command';
import { RetryNotificationCommand } from '@iotpilot/core/notification/application/commands/retry-notification/retry-notification.command';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

const isoTimestamp = () => new Date().toISOString();

const isAdminOrSuperAdmin = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';

export const notificationsRouter = Router();

// GET /notifications — list notification history
notificationsRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      send.forbidden(res, 'Tenant context required');
      return;
    }

    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
    const p = req.query;

    const filters = {
      // Non-admin callers can only see their own notifications
      userId: isAdminOrSuperAdmin(req.user?.role)
        ? (p['userId'] as string | undefined)
        : req.user?.id,
      type: p['type'] as string | undefined,
      channel: p['channel'] as string | undefined,
      status: p['status'] as string | undefined,
      from: p['from'] ? new Date(p['from'] as string) : undefined,
      to: p['to'] ? new Date(p['to'] as string) : undefined,
      page: p['page'] ? parseInt(p['page'] as string) : 1,
      limit: p['limit'] ? parseInt(p['limit'] as string) : 20,
    };

    const queryBus = ServiceContainer.getInstance().getQueryBus();
    const result = await queryBus.execute(
      GetNotificationHistoryQuery.create(customerId, filters, tenantContext)
    );

    send.ok(res, result);
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});

// GET /notifications/:id — get a single notification record
notificationsRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      send.forbidden(res, 'Tenant context required');
      return;
    }

    const id = req.params.id;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
    const queryBus = ServiceContainer.getInstance().getQueryBus();

    const record = await queryBus.execute(
      GetNotificationRecordQuery.create(id, customerId, tenantContext)
    );

    if (!isAdminOrSuperAdmin(req.user?.role) && record.userId !== req.user?.id) {
      send.forbidden(res, 'Access denied');
      return;
    }

    send.ok(res, record);
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});

// DELETE /notifications/:id — cancel a notification
notificationsRouter.delete('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      send.forbidden(res, 'Tenant context required');
      return;
    }

    const id = req.params.id;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
    const queryBus = ServiceContainer.getInstance().getQueryBus();

    // Load first to check ownership
    const record = await queryBus.execute(
      GetNotificationRecordQuery.create(id, customerId, tenantContext)
    );

    if (!isAdminOrSuperAdmin(req.user?.role) && record.userId !== req.user?.id) {
      send.forbidden(res, 'Access denied');
      return;
    }

    const commandBus = ServiceContainer.getInstance().getCommandBus();
    await commandBus.execute(
      CancelNotificationCommand.create(id, customerId, tenantContext)
    );

    send.ok(res, { cancelled: true });
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});

// POST /notifications/:id/retry — retry a notification
notificationsRouter.post('/:id/retry', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      send.forbidden(res, 'Tenant context required');
      return;
    }

    const id = req.params.id;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
    const queryBus = ServiceContainer.getInstance().getQueryBus();

    // Load first to check ownership
    const record = await queryBus.execute(
      GetNotificationRecordQuery.create(id, customerId, tenantContext)
    );

    if (!isAdminOrSuperAdmin(req.user?.role) && record.userId !== req.user?.id) {
      send.forbidden(res, 'Access denied');
      return;
    }

    const commandBus = ServiceContainer.getInstance().getCommandBus();
    await commandBus.execute(
      RetryNotificationCommand.create(id, customerId, tenantContext)
    );

    send.ok(res, { retried: true });
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});
