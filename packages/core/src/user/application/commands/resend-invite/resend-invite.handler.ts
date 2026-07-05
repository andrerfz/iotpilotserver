import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {ResendInviteCommand} from './resend-invite.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import type {EmailService} from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import {issueAndSendInvite} from '../invite-user/invite-token.helper';

export class InviteNotPendingException extends Error {
  constructor() {
    super('This user has already accepted their invitation or is not a pending invite');
    this.name = 'InviteNotPendingException';
  }
}

export interface ResendInviteResult {
  email: string;
}

/** Re-sends the accept-invite email for a still-PENDING member — a lost or
 * expired invite link shouldn't force an admin to delete and re-invite. */
export class ResendInviteHandler implements CommandHandler<ResendInviteCommand, ResendInviteResult> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async handle(command: ResendInviteCommand): Promise<ResendInviteResult> {
    const customerId = command.getCustomerId();
    const prisma = this.prismaService.getClient();

    const user = await prisma.user.findUnique({
      where: { id: command.userId },
      select: { id: true, email: true, status: true, customerId: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.customerId !== customerId.getValue()) {
      throw new Error('User not found');
    }
    if (user.status !== 'PENDING') {
      throw new InviteNotPendingException();
    }

    await issueAndSendInvite(this.prismaService, this.emailService, user.id, user.email, customerId.getValue());

    return { email: user.email };
  }
}
