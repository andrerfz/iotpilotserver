import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {AcceptInviteCommand} from './accept-invite.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {Password} from '@iotpilot/core/user/domain/value-objects/password.vo';
import {PasswordHasher} from '@iotpilot/core/user/domain/services/password-hasher';

const INVITE_TOKEN_TYPE = 'ORG_INVITE';

export class InvalidInviteTokenException extends Error {
  constructor() {
    super('This invitation link is invalid or has expired');
    this.name = 'InvalidInviteTokenException';
  }
}

export class InviteAlreadyAcceptedException extends Error {
  constructor() {
    super('This invitation has already been accepted');
    this.name = 'InviteAlreadyAcceptedException';
  }
}

export interface AcceptInviteResult {
  email: string;
}

export class AcceptInviteHandler implements CommandHandler<AcceptInviteCommand, AcceptInviteResult> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  private get prisma() {
    return this.prismaService.getClient();
  }

  async handle(command: AcceptInviteCommand): Promise<AcceptInviteResult> {
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        code: command.token,
        type: INVITE_TOKEN_TYPE,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true, status: true, deletedAt: true } } },
    });

    if (!record || !record.user || record.user.deletedAt) {
      throw new InvalidInviteTokenException();
    }
    if (record.user.status !== 'PENDING') {
      throw new InviteAlreadyAcceptedException();
    }

    const passwordVo = Password.create(command.password);
    const hashed = await this.passwordHasher.hash(passwordVo);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user.id },
        data: { password: hashed, status: 'ACTIVE' },
      }),
      this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { email: record.user.email };
  }
}
