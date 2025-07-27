import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {UserSession} from '@/lib/user/domain/entities/user-session.entity';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {SessionRepository} from '@/lib/user/domain/interfaces/session-repository.interface';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export class UserSessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sessionRepository: SessionRepository
  ) {}

  /**
   * Creates a new session for a user and invalidates previous active sessions.
   * If a Prisma transaction client is provided, it will be used for DB writes.
   */
  async createSession(userId: string, customerId?: string | null, tx?: PrismaClient): Promise<string> {
    const secret = (globalThis as any).process?.env?.JWT_SECRET as string | undefined;
    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is required for session creation. Please set it in your .env file.'
      );
    }

    // Use eval('require') to bypass webpack's static analysis
    const jwt: any = eval('require')('jsonwebtoken');
    if (!jwt) {
      throw new Error('jsonwebtoken dependency is required at runtime but could not be loaded');
    }

    const prisma = tx ?? this.prismaService.getClient();

    // Invalidate any existing active sessions for this user
    await prisma.session.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    const token = jwt.sign({ userId }, secret, { expiresIn: '24h' });

    const userIdVO = UserId.fromString(userId);
    const customerIdVO = customerId ? CustomerId.create(customerId) : null;
    const userSession = UserSession.create(userIdVO, customerIdVO, token, 24);

    if (tx) {
      await prisma.session.create({
        data: {
          id: userSession.getId().getValue(),
          token: userSession.getToken(),
          userId: userSession.getUserId().getValue(),
          customerId: userSession.getCustomerId()?.getValue() ?? null,
          expiresAt: userSession.getExpiresAt(),
          createdAt: userSession.getCreatedAt(),
          deletedAt: null
        }
      });
    } else {
      await this.sessionRepository.save(userSession);
    }

    return token;
  }
}


