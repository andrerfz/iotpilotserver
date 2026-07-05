import * as crypto from 'crypto';
import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {InviteUserCommand} from './invite-user.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {Email} from '@iotpilot/core/user/domain/value-objects/email.vo';
import type {EmailService} from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import {issueAndSendInvite} from './invite-token.helper';
import bcrypt from 'bcryptjs';

export class UserAlreadyInvitedException extends Error {
  constructor(email: string) {
    super(`A user with email ${email} already exists`);
    this.name = 'UserAlreadyInvitedException';
  }
}

export interface InviteUserResult {
  id: string;
  email: string;
  role: string;
  status: 'PENDING';
}

/**
 * Invites a new team member: creates a PENDING user (unusable placeholder
 * password — status alone already blocks login via UserAuthenticator.
 * checkIsActive()) and emails an accept-invite link. The invitee sets their
 * own password and is activated by AcceptInviteHandler.
 *
 * Writes directly via Prisma rather than the User repository/domain entity:
 * the domain model's `isActive` boolean collapses to ACTIVE/INACTIVE only
 * (see UserMapper) and has no PENDING concept, so the full repository path
 * cannot express "invited but not yet accepted".
 */
export class InviteUserHandler implements CommandHandler<InviteUserCommand, InviteUserResult> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private get prisma() {
    return this.prismaService.getClient();
  }

  async handle(command: InviteUserCommand): Promise<InviteUserResult> {
    const customerId = command.getCustomerId();
    const email = Email.fromString(command.email).getValue();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new UserAlreadyInvitedException(email);
    }

    const username = await this.generateUniqueUsername(email);
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: placeholderHash,
        role: command.role,
        status: 'PENDING',
        customerId: customerId.getValue(),
      },
      select: { id: true, publicId: true, email: true, role: true },
    });

    await issueAndSendInvite(this.prismaService, this.emailService, user.id, email, customerId.getValue());

    return { id: user.publicId, email: user.email, role: user.role, status: 'PENDING' };
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'user';
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!taken) return candidate;
      candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    }
    return `${base}-${crypto.randomUUID()}`;
  }

}
