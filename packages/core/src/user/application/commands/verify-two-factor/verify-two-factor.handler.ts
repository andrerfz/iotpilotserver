import { CommandHandler } from '@iotpilot/core/shared/application/interfaces/command.interface';
import { VerifyTwoFactorCommand } from './verify-two-factor.command';
import { PrismaService } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { UserSessionService } from '@iotpilot/core/user/infrastructure/services/user-session.service';

interface VerifyResult {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
        customerId: string | null;
    };
}

export class VerifyTwoFactorHandler implements CommandHandler<VerifyTwoFactorCommand, VerifyResult> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sessionService: UserSessionService,
    ) {}

    async handle(command: VerifyTwoFactorCommand): Promise<VerifyResult> {
        const record = await this.prisma.getClient().verificationCode.findFirst({
            where: {
                userId: command.userId,
                code: command.code,
                type: 'TWO_FACTOR',
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });

        if (!record) {
            throw new Error('Invalid or expired verification code');
        }

        await this.prisma.getClient().verificationCode.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        });

        const user = await this.prisma.getClient().user.findUniqueOrThrow({
            where: { id: command.userId },
        });

        const token = await this.sessionService.createSession(user.id, command.customerId);

        await this.prisma.getClient().user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                customerId: user.customerId,
            },
        };
    }
}
