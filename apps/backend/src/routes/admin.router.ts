import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { prisma as prismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { tenantPrisma } from '@iotpilot/core/tenant-middleware';
import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
import { resolveUserPublicId } from '@iotpilot/core/user/infrastructure/services/user-id-resolver';
import { DeviceStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import os from 'os';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { UpdateUserCommand } from '@iotpilot/core/user/application/commands/update-user/update-user.command';

export const adminRouter = Router();

const prisma = prismaService.getClient();

function isoTimestamp(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateDeviceId(): string {
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += CHARSET[bytes[i] % CHARSET.length];
    part2 += CHARSET[bytes[i + 4] % CHARSET.length];
  }
  return `IOT-${part1}-${part2}`;
}

const v = validator();
const preregisterSchema = v.object({
  count: v.number({ min: 1, max: 500 }),
});

/**
 * GET /api/admin/devices?status=UNCLAIMED&page=1&limit=20
 *
 * List devices filtered by status. SUPERADMIN only.
 */
adminRouter.get('/devices', requireAuth('SUPERADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const searchParams = new URLSearchParams(req.query as Record<string, string>);
    const status = req.query.status as string | undefined;

    const { limit, skip, validation } = Pagination.fromQueryParams(searchParams, 20, 100);

    if (!validation.isValid) {
      send.badRequest(res, 'Invalid pagination', validation.errors);
      return;
    }

    const where: Prisma.DeviceWhereInput = { deletedAt: null };
    if (status) {
      where.status = status as DeviceStatus;
    }

    const [rawDevices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        select: {
          id: true,
          publicId: true,
          deviceId: true,
          name: true,
          status: true,
          customerId: true,
          macAddress: true,
          ipAddress: true,
          registeredAt: true,
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.device.count({ where }),
    ]);

    const devices = rawDevices.map(d => ({
      id: d.publicId || d.id,
      deviceId: d.deviceId,
      name: d.name,
      status: d.status,
      customerId: d.customerId,
      macAddress: d.macAddress,
      ipAddress: d.ipAddress,
      registeredAt: d.registeredAt,
    }));

    send.ok(res, { devices, total });
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});

/**
 * POST /api/admin/devices
 *
 * Pre-register UNCLAIMED devices in bulk. SUPERADMIN only.
 * Body: { "count": 10 }
 * Returns: { "devices": ["IOT-XXXX-YYYY", ...], "count": 10 }
 */
adminRouter.post('/devices', requireAuth('SUPERADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const result = preregisterSchema.safeParse(body);

    if (!result.success || !result.data) {
      send.badRequest(res, 'Invalid request', result.errors);
      return;
    }

    const count = result.data.count;

    // Fetch existing IDs to avoid collisions
    const existing = await prisma.device.findMany({
      select: { deviceId: true },
    });
    const existingIds = new Set(existing.map(d => d.deviceId));

    // Generate unique IDs
    const newIds: string[] = [];
    let attempts = 0;
    const maxAttempts = count * 10;

    while (newIds.length < count && attempts < maxAttempts) {
      attempts++;
      const id = generateDeviceId();
      if (!existingIds.has(id) && !newIds.includes(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length < count) {
      send.badRequest(res, `Could only generate ${newIds.length} unique IDs`);
      return;
    }

    // Batch insert
    const now = new Date();
    const inserted = await prisma.device.createMany({
      data: newIds.map(deviceId => ({
        id: crypto.randomUUID(),
        deviceId,
        name: `Unclaimed Device ${deviceId}`,
        status: DeviceStatus.UNCLAIMED,
        metadata: {},
        registeredAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    });

    send.ok(res, {
      devices: newIds,
      count: inserted.count,
    });
    return;
  } catch (err) {
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/users?status=PENDING&page=1&limit=10
 *
 * List users with optional filtering. ADMIN or SUPERADMIN only.
 */
adminRouter.get('/users', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const searchParams = new URLSearchParams(req.query as Record<string, string>);
    const status = req.query.status as string | undefined;

    const { page, limit, skip, validation } = Pagination.fromQueryParams(searchParams, 10, 100);

    if (!validation.isValid) {
      send.badRequest(res, 'Invalid pagination', validation.errors);
      return;
    }

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const currentUser = req.user;
    if (!currentUser) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    // Only ADMIN or SUPERADMIN can list users
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
      send.forbidden(res, 'Insufficient permissions');
      return;
    }

    // The tenant middleware will automatically filter by customerId
    // and exclude SUPERADMIN users from results
    const users = await (tenantPrisma.client.user.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }) as unknown) as Array<{
      id: string;
      email: string;
      username: string;
      role: string;
      status: string;
      createdAt: Date;
      customerId?: string;
    }>;

    const totalCount = await tenantPrisma.client.user.count({
      where: filter,
    });

    // Map to expose publicId as id (not internal CUID)
    const mappedUsers = users.map((u: any) => ({
      id: u.publicId || u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      status: u.status,
      customerId: u.customerId || null,
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      createdAt: u.createdAt,
    }));

    const pagination = Pagination.create(page, limit, totalCount);
    send.ok(res, mappedUsers, { pagination });
    return;
  } catch (err) {
    console.error('List users error:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// User approval
// ---------------------------------------------------------------------------

// Define UserStatus enum values directly since there's an issue with importing from @prisma/client
enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

// Validation schema for approval action
const approvalValidator = validator();
const approvalSchema = approvalValidator.object({
  action: approvalValidator.enum(['approve', 'reject'] as const),
  reason: approvalValidator.optional(approvalValidator.string()),
});

/**
 * POST /api/admin/users/:id/approve
 *
 * Approve or reject a user. ADMIN or SUPERADMIN only.
 * Body: { "action": "approve" | "reject", "reason"?: string }
 */
adminRouter.post('/users/:id/approve', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const publicId = req.params.id;
    if (!publicId) {
      send.badRequest(res, 'User ID is required');
      return;
    }

    const id = await resolveUserPublicId(publicId);
    if (!id) {
      send.notFound(res, 'User not found');
      return;
    }

    const body = req.body;
    const { action, reason } = approvalSchema.parse(body);

    const currentUser = req.user;
    if (!currentUser) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    // Only ADMIN or SUPERADMIN can approve/reject users
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
      send.forbidden(res, 'Insufficient permissions');
      return;
    }

    // Find the user to approve/reject
    // The tenant middleware will automatically filter by customerId
    // and exclude SUPERADMIN users from results
    const userToUpdate = await tenantPrisma.client.user.findUnique({
      where: { id },
    }) as unknown as {
      id: string;
      email: string;
      username: string;
      role: string;
      status: UserStatus;
      customerId?: string;
    };

    if (!userToUpdate) {
      send.notFound(res, 'User not found');
      return;
    }

    // Check if user is already in the requested state
    if (
      (action === 'approve' && userToUpdate.status === UserStatus.ACTIVE) ||
      (action === 'reject' && userToUpdate.status === UserStatus.INACTIVE)
    ) {
      send.ok(res, {
        message: `User is already ${action === 'approve' ? 'approved' : 'rejected'}`,
      });
      return;
    }

    const tenantContext = currentUser.customerId
      ? TenantContextImpl.create(CustomerId.create(currentUser.customerId))
      : TenantContextImpl.createSuperAdmin();

    const commandBus = ServiceContainer.getInstance().getCommandBus();
    await commandBus.execute(new UpdateUserCommand(
      tenantContext,
      id,
      undefined, undefined, undefined, undefined, undefined,
      action === 'approve',
    ));

    send.ok(res, {
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
    return;
  } catch (err) {
    console.error('User approval error:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/logs
 *
 * List device logs for the current tenant. ADMIN or SUPERADMIN only.
 * DeviceLog has no customerId column, so we scope via device.customerId join.
 */
adminRouter.get('/logs', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      send.unauthorized(res, 'Authentication required');
      return;
    }
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
      send.forbidden(res, 'Insufficient permissions');
      return;
    }

    const level = req.query.level as string | undefined || undefined;
    const deviceId = req.query.deviceId as string | undefined || undefined;
    const source = req.query.source as string | undefined || undefined;
    const search = req.query.search as string | undefined || undefined;
    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string || '50')));
    const skip = (page - 1) * limit;

    // Tenant scope: for non-SUPERADMIN, restrict logs to devices owned by this tenant
    const tenantDeviceFilter = currentUser.role === 'SUPERADMIN'
      ? {}
      : { device: { customerId: currentUser.customerId } };

    const where: any = {
      ...tenantDeviceFilter,
      deletedAt: null,
    };

    if (level) where.level = level;
    if (deviceId) where.deviceId = deviceId;
    if (source) where.source = source;
    if (search) where.message = { contains: search, mode: 'insensitive' };

    const [logs, totalCount, sources] = await Promise.all([
      prismaService.getClient().deviceLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          device: { select: { hostname: true, deviceId: true } },
        },
      }),
      prismaService.getClient().deviceLog.count({ where }),
      prismaService.getClient().deviceLog.findMany({
        where: { ...tenantDeviceFilter, source: { not: null } },
        select: { source: true },
        distinct: ['source'],
      }),
    ]);

    // Devices list for filter dropdown — use tenantPrisma (has customerId)
    const devices = await tenantPrisma.client.device.findMany({
      select: { id: true, hostname: true, deviceId: true },
      orderBy: { hostname: 'asc' },
    });

    const pagination = Pagination.create(page, limit, totalCount);
    send.ok(res, logs, {
      pagination,
      filters: {
        sources: sources.map((s: { source: string | null }) => s.source),
        devices,
      },
    });
    return;
  } catch (err) {
    console.error('Logs error:', err);
    send.fromError(res, err);
  }
});

// ---------------------------------------------------------------------------
// System health
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/system
 *
 * Get system health metrics. ADMIN or SUPERADMIN only.
 */
adminRouter.get('/system', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      send.unauthorized(res, 'Authentication required');
      return;
    }

    // Only ADMIN or SUPERADMIN can access system health
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
      send.forbidden(res, 'Insufficient permissions');
      return;
    }

    // Get system metrics
    const systemMetrics = {
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        loadAvg: os.loadavg(),
        utilization: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usedPercentage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      timestamp: new Date(),
    };

    // Get database metrics
    const dbMetrics = await getDatabaseMetrics(currentUser.role === 'SUPERADMIN');

    // Get application metrics
    const appMetrics = await getApplicationMetrics(currentUser.role === 'SUPERADMIN');

    send.ok(res, {
      system: systemMetrics,
      database: dbMetrics,
      application: appMetrics,
    });
    return;
  } catch (err) {
    console.error('System health error:', err);
    send.fromError(res, err);
  }
});

// Helper function to get database metrics
async function getDatabaseMetrics(isSuperAdmin: boolean) {
  try {
    const [
      userCount,
      deviceCount,
      alertCount,
      customerCount,
    ] = await Promise.all([
      tenantPrisma.client.user.count(),
      tenantPrisma.client.device.count(),
      tenantPrisma.client.alert.count(),
      isSuperAdmin
        ? (tenantPrisma.client as any).customer?.count() ?? Promise.resolve(0)
        : Promise.resolve(1),
    ]);

    const recentActivity = await tenantPrisma.client.device.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        hostname: true,
        updatedAt: true,
      },
    });

    return {
      counts: {
        users: userCount,
        devices: deviceCount,
        alerts: alertCount,
        customers: customerCount,
      },
      recentActivity,
      status: 'healthy',
    };
  } catch (error) {
    console.error('Database metrics error:', error);
    return {
      status: 'error',
      error: 'Failed to fetch database metrics',
    };
  }
}

// Helper function to get application metrics
async function getApplicationMetrics(isSuperAdmin: boolean) {
  try {
    // In a real implementation, you would gather metrics from your application
    // For now, we'll return some placeholder data
    return {
      status: 'healthy',
      version: '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      features: {
        multiTenant: true,
        advancedMetrics: true,
        tailscale: true,
      },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
  } catch (error) {
    console.error('Application metrics error:', error);
    return {
      status: 'error',
      error: 'Failed to fetch application metrics',
    };
  }
}

/**
 * GET /api/admin/stats
 *
 * Dashboard summary counts for the admin page.
 * SUPERADMIN sees platform-wide counts; ADMIN sees their own tenant.
 */
adminRouter.get('/stats', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'SUPERADMIN';
    const customerId = req.user?.customerId;
    const where = isSuperAdmin ? {} : { customerId: customerId! };

    const [userCount, deviceCount, alertCount, activeDevices] = await Promise.all([
      prisma.user.count({ where }),
      prisma.device.count({ where }),
      prisma.alert.count({ where: { ...where, resolved: false } }),
      prisma.device.count({ where: { ...where, status: 'ONLINE' } }),
    ]);

    send.ok(res, { userCount, deviceCount, alertCount, activeDevices });
  } catch (err) {
    send.fromError(res, err);
  }
});
