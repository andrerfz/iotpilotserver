import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';
import {SessionId, UserSession} from '@/lib/user/domain/entities/user-session.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

type PrismaClient = ReturnType<PrismaService['getClient']>;

type PrismaSessionRow = {
  id: string;
  userId: string;
  customerId: string | null;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
};

export class PrismaSessionRepository implements SessionRepository {
  private readonly prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  private get prisma(): PrismaClient {
    return this.prismaService.getClient();
  }

  async findById(id: SessionId, tenantContext?: TenantContext): Promise<UserSession | null> {
    const row = await this.prisma.session.findFirst({
      where: {
        id: id.getValue(),
        deletedAt: null,
        ...(this.tenantWhere(tenantContext) ?? {})
      }
    });
    return row ? this.toDomain(row as PrismaSessionRow) : null;
  }

  async findAll(tenantContext?: TenantContext): Promise<UserSession[]> {
    const rows = await this.prisma.session.findMany({
      where: {
        deletedAt: null,
        ...(this.tenantWhere(tenantContext) ?? {})
      }
    });
    return rows.map((r) => this.toDomain(r as PrismaSessionRow));
  }

  async save(entity: UserSession, tenantContext?: TenantContext): Promise<void> {
    // Sessions are scoped by customerId; do a best-effort tenant check when context exists.
    this.assertTenantAccess(entity.getCustomerId(), tenantContext);

    await this.prisma.session.upsert({
      where: { token: entity.getToken() },
      create: {
        id: entity.getId().getValue(),
        userId: entity.getUserId().getValue(),
        customerId: entity.getCustomerId()?.getValue() ?? null,
        token: entity.getToken(),
        expiresAt: entity.getExpiresAt(),
        createdAt: entity.getCreatedAt(),
        deletedAt: entity.isRevoked() ? new Date() : null
      },
      update: {
        userId: entity.getUserId().getValue(),
        customerId: entity.getCustomerId()?.getValue() ?? null,
        expiresAt: entity.getExpiresAt(),
        deletedAt: entity.isRevoked() ? new Date() : null
      }
    });
  }

  async delete(id: SessionId, tenantContext?: TenantContext): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: id.getValue() } });
    if (!session) return;

    this.assertTenantAccess(
      (session as any).customerId ? CustomerId.create((session as any).customerId) : null,
      tenantContext
    );

    await this.prisma.session.update({
      where: { id: id.getValue() },
      data: { deletedAt: new Date() }
    });
  }

  async findByToken(token: string): Promise<UserSession | null> {
    const row = await this.prisma.session.findUnique({
      where: { token }
    });

    if (!row) return null;
    const casted = row as PrismaSessionRow;

    if (casted.deletedAt) return null;
    if (casted.expiresAt <= new Date()) return null;

    return this.toDomain(casted);
  }

  async findByUserId(userId: UserId): Promise<UserSession[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId: userId.getValue(), deletedAt: null }
    });
    return rows.map((r) => this.toDomain(r as PrismaSessionRow));
  }

  async findByUserIdInTenant(userId: UserId, customerId: CustomerId): Promise<UserSession[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId: userId.getValue(), customerId: customerId.getValue(), deletedAt: null }
    });
    return rows.map((r) => this.toDomain(r as PrismaSessionRow));
  }

  async revokeAllForUser(userId: UserId): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId: userId.getValue(), deletedAt: null },
      data: { deletedAt: new Date() }
    });
  }

  async revokeAllForUserInTenant(userId: UserId, customerId: CustomerId): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId: userId.getValue(), customerId: customerId.getValue(), deletedAt: null },
      data: { deletedAt: new Date() }
    });
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  }

  async cleanExpiredSessionsInTenant(customerId: CustomerId): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() }, customerId: customerId.getValue() }
    });
  }

  private toDomain(row: PrismaSessionRow): UserSession {
    return new UserSession(
      SessionId.fromString(row.id),
      UserId.fromString(row.userId),
      row.customerId ? CustomerId.create(row.customerId) : null,
      row.token,
      row.expiresAt,
      row.createdAt,
      row.deletedAt !== null
    );
  }

  private tenantWhere(tenantContext?: TenantContext): { customerId: string | null } | null {
    if (!tenantContext) return null;
    if (tenantContext.isSuperAdminUser()) return null;
    const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
    return { customerId: tenantId };
  }

  private assertTenantAccess(sessionCustomerId: CustomerId | null, tenantContext?: TenantContext): void {
    if (!tenantContext) return;
    if (tenantContext.isSuperAdminUser()) return;

    const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
    const sessionTenantId = sessionCustomerId?.getValue() ?? null;

    // Non-superadmin must not mutate sessions from a different tenant.
    if (tenantId && sessionTenantId && tenantId !== sessionTenantId) {
      throw new Error(
        `Tenant boundary violation: attempted to access a session from tenant '${sessionTenantId}' while in tenant '${tenantId}'`
      );
    }
  }
}


