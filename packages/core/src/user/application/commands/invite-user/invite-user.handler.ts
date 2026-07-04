import * as crypto from 'crypto';
import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {InviteUserCommand} from './invite-user.command';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {Email} from '@iotpilot/core/user/domain/value-objects/email.vo';
import type {EmailService} from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import {renderEmailLayout} from '@iotpilot/core/shared/infrastructure/services/email-layout';
import bcrypt from 'bcryptjs';

const INVITE_EXPIRY_DAYS = 7;
const INVITE_TOKEN_TYPE = 'ORG_INVITE';

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

    const token = crypto.randomBytes(24).toString('base64url');
    await this.prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: token,
        type: INVITE_TOKEN_TYPE,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId.getValue() },
      select: { name: true },
    });

    await this.sendInviteEmail(email, customer?.name ?? 'your organization', token);

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

  private async sendInviteEmail(email: string, orgName: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'https://iotpilotserver.test');
    const acceptUrl = `${baseUrl}/accept-invite?token=${token}`;

    const content = `
  <div style="font-size:18px;font-weight:600;margin-bottom:6px;">You're invited to join ${escapeHtml(orgName)}</div>
  <p style="color:#555;font-size:14px;line-height:1.5;margin:0 0 20px;">Someone at ${escapeHtml(orgName)} invited you to their IoT Pilot organization. Click below to set your password and get started.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${acceptUrl}" style="display:inline-block;background:#0054e9;color:#ffffff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Accept invitation</a>
  </div>
  <p style="color:#999;font-size:12px;line-height:1.5;">This link expires in ${INVITE_EXPIRY_DAYS} days. If you weren't expecting this, you can safely ignore this email.</p>`;

    await this.emailService.send({
      to: email,
      subject: `You're invited to join ${orgName} on IoT Pilot`,
      html: renderEmailLayout(content, 'IoT Pilot · organization invitation.'),
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
