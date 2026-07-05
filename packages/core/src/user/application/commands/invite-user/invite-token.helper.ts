import * as crypto from 'crypto';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import type { EmailService } from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import { renderEmailLayout } from '@iotpilot/core/shared/infrastructure/services/email-layout';

export const INVITE_EXPIRY_DAYS = 7;
export const INVITE_TOKEN_TYPE = 'ORG_INVITE';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Invalidates any prior unused invite token for this user, issues a fresh one,
 * and emails the branded accept-invite link. Shared by InviteUserHandler
 * (first send) and ResendInviteHandler (a lost/expired invite) so both send
 * byte-identical emails and neither can leave two live tokens for one user.
 */
export async function issueAndSendInvite(
  prismaService: PrismaService,
  emailService: EmailService,
  userId: string,
  email: string,
  customerId: string,
): Promise<void> {
  const prisma = prismaService.getClient();

  await prisma.verificationCode.updateMany({
    where: { userId, type: INVITE_TOKEN_TYPE, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(24).toString('base64url');
  await prisma.verificationCode.create({
    data: {
      userId,
      code: token,
      type: INVITE_TOKEN_TYPE,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true },
  });
  const orgName = customer?.name ?? 'your organization';

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

  await emailService.send({
    to: email,
    subject: `You're invited to join ${orgName} on IoT Pilot`,
    html: renderEmailLayout(content, 'IoT Pilot · organization invitation.'),
  });
}
