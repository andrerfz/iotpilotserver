import { randomInt } from 'crypto';
import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { SendVerificationCodeCommand } from './send-verification-code.command';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import type { EmailService } from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import { renderEmailLayout } from '@iotpilot/core/shared/infrastructure/services/email-layout';

export class SendVerificationCodeHandler implements CommandHandler<SendVerificationCodeCommand, void> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) {}

    async handle(command: SendVerificationCodeCommand): Promise<void> {
        // Cryptographically secure 6-digit code (100000–999999). randomInt is
        // unbiased over the range; never use Math.random() for security tokens.
        const code = String(randomInt(100000, 1000000));

        await this.prisma.getClient().verificationCode.updateMany({
            where: {
                userId: command.userId,
                type: command.codeType,
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });

        await this.prisma.getClient().verificationCode.create({
            data: {
                userId: command.userId,
                code,
                type: command.codeType,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        const subjectMap = {
            TWO_FACTOR: 'Your login verification code',
            PASSWORD_RESET: 'Your password reset code',
            EMAIL_VERIFY: 'Verify your email address',
        };

        const content = `
  <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Verification code</div>
  <p style="color:#555;font-size:14px;margin:0 0 20px;">Enter this code to continue:</p>
  <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;">
    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;">${code}</span>
  </div>`;

        await this.emailService.send({
            to: command.email,
            subject: `IoT Pilot — ${subjectMap[command.codeType]}`,
            html: renderEmailLayout(
                content,
                "This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.",
            ),
        });
    }
}
