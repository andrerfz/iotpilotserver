import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { UserRole, UserRoleType } from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import { TenantContext, TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { UserId } from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import { withTenant } from '@iotpilot/core/tenant-middleware';
import { send } from '../http/response.util';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRoleType;
  customerId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  tenant?: TenantContext;
}

function extractToken(req: Request): string | null {
  const cookie = req.cookies?.['auth-token'];
  if (cookie) return cookie;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return null;
}

export async function resolveUser(token: string): Promise<AuthUser | null> {
  let payload: { userId: string; email: string; role: UserRoleType };
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload;
  } catch {
    return null;
  }

  const prisma = ServiceContainer.getInstance().getPrismaClient();
  const session = await prisma.getClient().session.findFirst({
    where: { token, expiresAt: { gt: new Date() }, deletedAt: null },
    include: {
      user: {
        select: {
          id: true, publicId: true, email: true,
          username: true, role: true, customerId: true, deletedAt: true,
        },
      },
    },
  });

  if (!session || session.user.deletedAt) return null;
  return session.user as unknown as AuthUser;
}

async function resolveApiKeyUser(apiKey: string): Promise<AuthUser | null> {
  const prisma = ServiceContainer.getInstance().getPrismaClient();
  const key = await prisma.getClient().apiKey.findFirst({
    where: {
      key: apiKey,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      user: {
        select: {
          id: true, publicId: true, email: true,
          username: true, role: true, customerId: true, deletedAt: true,
        },
      },
    },
  });
  if (!key || key.user.deletedAt) return null;
  // fire-and-forget last used update
  prisma.getClient().apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } }).catch(() => {});
  return key.user as unknown as AuthUser;
}

export interface AuthOptions {
  requiredRole?: UserRoleType;
  allowApiKey?: boolean;
}

function buildTenantContext(user: AuthUser, req: Request): TenantContext | null {
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const customerId = user.customerId
    ? CustomerId.fromString(user.customerId)
    : isSuperAdmin
      ? (req.headers['x-customer-id'] ? CustomerId.fromString(req.headers['x-customer-id'] as string) : null)
      : null;

  if (!isSuperAdmin && !customerId) return null;

  const userId = UserId.fromString(user.id);
  const userRole = UserRole.fromString(user.role);

  return TenantContextImpl.createFromRequest(
    customerId,
    userId,
    userRole,
    `req-${Date.now()}`,
    req.originalUrl,
    req.headers['user-agent'],
    (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip,
  );
}

export function authMiddleware(options: AuthOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let user: AuthUser | null = null;

      if (options.allowApiKey) {
        const apiKey =
          req.headers['x-api-key'] as string | undefined ||
          (req.headers.authorization?.startsWith('ApiKey ')
            ? req.headers.authorization.substring(7)
            : undefined);
        if (apiKey) user = await resolveApiKeyUser(apiKey);
      }

      if (!user) {
        const token = extractToken(req);
        if (!token) { send.unauthorized(res); return; }
        user = await resolveUser(token);
      }

      if (!user) { send.unauthorized(res, 'Invalid or expired session'); return; }

      if (options.requiredRole) {
        const role = UserRole.fromString(user.role);
        if (!role.hasRole(options.requiredRole)) { send.forbidden(res); return; }
      }

      const tenant = buildTenantContext(user, req);
      if (!tenant && user.role !== 'SUPERADMIN') {
        send.badRequest(res, 'Missing customer context');
        return;
      }

      req.user = user;
      req.tenant = tenant ?? undefined;

      if (tenant) {
        await withTenant(tenant, () => {
          next();
          return Promise.resolve();
        });
      } else {
        next();
      }
    } catch (err) {
      send.internalError(res);
    }
  };
}

export const requireAuth = (role?: UserRoleType) => authMiddleware({ requiredRole: role });
export const requireAuthWithApiKey = (role?: UserRoleType) => authMiddleware({ allowApiKey: true, requiredRole: role });
